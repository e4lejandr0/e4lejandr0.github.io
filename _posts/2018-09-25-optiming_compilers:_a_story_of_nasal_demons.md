---
title: "Optimizing Compilers: A story of Nasal Demons"
layout: post
tags: ['c', 'asm', 'compilers', 'gcc', 'clang']
author: Alex
---
Well today I really should be doing other things but I have decided to write
a blog post about optimizing compilers. Let's start by separating compilers
into two categories.

# Naive Compilers

First we have the naive compilers that will translate your C code into assembler,
they will do a more or less one-to-one or one-to-many mapping between the code you
wrote and the generated assembly. These compilers are easy to understand the code
we write has a direct relationship with the generated assembly and hence the code 
that will be executed. The downside of these compilers is that they leave up to the
programmer to optimize their code so it runs as fast as possible. Humans are famously
bad at optimizing code.

A couple examples of this type of compiler:

1. [Tiny C Compiler](https://bellard.org/tcc/)
2. [Nils Weller's C Compiler](http://nwcc.sourceforge.net/)
3. [8cc C Compiler](https://github.com/rui314/8cc)

These compilers will produce code that is massively slower than compilers that perform
optimization.

# Optimizing Compilers

The second group is harder to understand. These compilers perform optimizations before
generating assembler. This can lead to some rather surprising situations if one is not
aware of this fact. Because the optimization phase happens after parsing but before code
generation we have the unfortunate side-effect that the generated assembly no longer maps
to the source in a one-to-one manner.

Let's take a look at some snippets:

```c

int main(void)
{
    int j = 0;
    for(int i = 0; i < 100; ++i) {
        j++;
    }
    return j;
}
```

This is a very simple program that does nothing useful, let's do a quick walk-through:

1. The program allocates a variable `j` and sets it `0`
2. The program allocates a new variable `i` and sets it to `0`
3. The program loops, while `i < 100` and increments `i` at each step
4. The body of the loop increases `j` at each step
5. After 100 loops the program returns the value of `j` after being increment 100 times(so `j == 100`)

We are doing exactly what the computer should be doing *right*? Err no. Depending on compiler
optimizations the whole loop might be completely removed! We can see this if we take a look at the
disssambled output:

```asm
main:
        push    rbp
        mov     rbp, rsp
        mov     DWORD PTR [rbp-4], 0  ; set j = 0
        mov     DWORD PTR [rbp-8], 0  ; set i = 0 
.L3:
        cmp     DWORD PTR [rbp-8], 99 ; compare i against 99
        jg      .L2                   ; if i > 99 jump to the exit
        add     DWORD PTR [rbp-4], 1  ; increase j
        add     DWORD PTR [rbp-8], 1  ; increase i
        jmp     .L3                   ; jump back to beginning of the loop
.L2:
        mov     eax, DWORD PTR [rbp-4] ; put the value of j in eax to prepare for return
        pop     rbp                    ; return to the caller
        ret 
```
(example compiled without optimization)

```asm
main:
        mov     eax, 100  ; we just return a hardcoded 100
        ret 
```
(example compiled with `-O2`)

The first snippet was compiled without optimizations. It is a naive translation of our C Code and
I have added comments to show how each line relates to our program.

But the more interesting example is the second one. We can see that it is *much* smaller than the
unoptimized. The compiler was able to realize that our loop doesn't have any side-effects other than
increasing `j` it then also figured out that the loop does a fixed amount of iterations. After coming
to the realization that `j` increases every loop and the number of loops is always `100` the compiler
was to get rid of the *whole loop* and replace it for a simple `return 100;`.

This is an example of the kinds of transformations code suffers when it goes through optimization!
The code we wrote and the code that was executed by the computer are *completely* different. In this
case we get a small performance but over a huge code base these transformations really add up.

# Nasal Demons: when the compiler bites you

Okay so far we have seen that the compiler can modify our code at its will but how far can the compiler
go? Well, in C code the compilers are guaranteed to abide by the **as if** rule meaning that they can
make aggressive optimizations as long as the resultant program behaves **as if** the optimizations weren't
applied. In our little example the program has the same *observable* behaviour, the main function returns
`100`.

However in C we have what is called **undefined behaviour**. The compiler is allowed to assume that
undefined behaviour never happens, even if it does, and this can lead to some awful bugs that are only
there in release mode! We can take a look at this:

```c
#include <stdio.h>

static void (*DoStuff)(void);

static void NeverCalled()
{
    printf("I was never called\n");
}

void SetDoStuff()
{
    DoStuff = NeverCalled;
}

int main() {
    DoStuff();
}
```

In this example we have a pointer to a function `DoStuff` which is set to `NULL`. Then we have a couple
functions: `SetDoStuff` which sets `DoStuff = NeverCalled` and we have `NeverCalled` function that is
not being called by anyone. If we do a bit of walk-through to this program it looks something like:

1. Enter main function
2. Called function pointed to by `DoStuff`
3. `DoStuff` is set to `NULL` so this program will probably crash!

And that is what happens on an *unoptimized* build. Let's take a look at how this changes:

```asm
NeverCalled():                       # @NeverCalled()
        push    rbp
        mov     rbp, rsp
        sub     rsp, 16
        movabs  rdi, offset .L.str
        mov     al, 0
        call    printf
        mov     dword ptr [rbp - 4], eax # 4-byte Spill
        add     rsp, 16
        pop     rbp
        ret
SetDoStuff():                        # @SetDoStuff()
        push    rbp
        mov     rbp, rsp
        movabs  rax, offset NeverCalled()
        mov     qword ptr [_ZL7DoStuff], rax
        pop     rbp
        ret
main:                                   # @main
        push    rbp
        mov     rbp, rsp
        call    qword ptr [_ZL7DoStuff]  ; call `DoStuff`. we never set it so this will probably crash
        xor     eax, eax
        pop     rbp
        ret
.L.str:
        .asciz  "I was never called\n"
```
(compiled with clang: no optimizations)

```asm
NeverCalled():                       # @NeverCalled()
        mov     edi, offset .Lstr
        jmp     puts                 #
SetDoStuff():                        # @SetDoStuff()
        ret
main:                                # @main
        push    rax                  # there is no sign of `DoStuff`
        mov     edi, offset .Lstr    # the program is calling `puts`
        call    puts                 # with the message "I was never called"
        xor     eax, eax
        pop     rcx
        ret
.Lstr:
        .asciz  "I was never called"
```
(compiled with clang: `-O2`)

So in this case we can see in the disassembly that the first version just plain tries to call the
function stored in `DoStuff`. We never set this variable in our program so trying to dereference it
will probably lead to segmentation fault as is expected.

On the other hand we have the second snippet. There is no sign of `DoStuff` and we see that the assembler
just makes a direct and unconditional call to `puts` and the program prints `I was never called`. The compiler
called a function that we *never* called in our source code!

## Why this happens?

This last program is an example of undefined behaviour. We are trying to dereference a uninitialized pointer!
(no one ever does that, right?). Because the compiler is allowed to assume that undefined behaviour never occurs
it saw that the only place in our program that we initialize `DoStuff` is in the `SetDoStuff` function so for the
`DoStuff()` call to not be undefined behaviour then `SetStuff()` must have been called at some point.

If `SetStuff()` was called at some point then `DoStuff()` must be initialized to `NeverCalled()` for line 16
to be valid. Hence the compiler has decided to just directly call `NeverCalled()` for us!

It is worth noting that this behaviour only occurs on `clang` as `gcc` has a different optimizer. If someone can
show me something similar for GCC I would appreciate it!

I'll leave links to the [Compiler Explorer](https://godbolt.org/) so you can play around with different
optimization levels.

# Source Code

1. [Simple Loop](https://godbolt.org/z/eAT7Nv)
2. [Undefined Behaviour Example](https://godbolt.org/z/VTRohV)
