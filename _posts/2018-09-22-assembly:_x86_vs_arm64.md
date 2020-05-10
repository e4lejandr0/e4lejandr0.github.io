---
title: "Assembly: x86 vs ARM64"
layout: post
tags: []
author: Alex
---
In today's blog post I will implement and compare a program in
assembler using the x86 instruction set as well as the ARM64 instruction
set. Throughout this article I will be using AT&T syntax as required by school.

# A simple loop: x86

Okay, let's start by taking a look at a simple loop:

```asm
.text
.globl    _start

start = 0
end = 30

_start:
    mov    $start, %r15   /* initialize loop counter */

loop_init:
    movq    $len, %rdx    /* message length */
    movq    $msg, %rsi    /* message location */
    movq    $1, %rdi      /* file descriptor stdout */
    movq    $1, %rax      /* syscall sys_write */
    syscall
    inc %r15
    cmp $end, %r15
    jne loop_init

    movq    $0, %rdi       /* exit status */
    movq    $60, %rax      /* syscall sys_exit */
    syscall

.section .rodata

msg:    .ascii      "Loop!\n"
    len = . - msg

```

This is a simple program that does one thing: it prints "Loop!" 30 times.
As expected the very first thing we do is to initialize our loop counter
to `0` on line 8. After that we proceed to set up the parameteres for a
system call. We are making use of the `write()` system call which takes
a file descriptor, a pointer to some data and a the length of the data.

We perform the actual system call with the syscall instruction(it could
also be done by doing `int 80h`) and then we increment out loop counter.
We proceed to compare to the `end` which marks the end of the loop. If
we haven't reached the end the program will jump back to the `loop_init`
line giving us a loop.

Okay so this is a simple program written in x86 assembler. Now let's take
a look at the same program but for ARM64.

## A simple loop: ARM64

Now we will take a look at the ARM64 version of the same program. There are
some major differences between x86\_64 and ARM64 and some of them determine
how software will be written or compiled for that particular architecture.

```asm
.text
.globl _start

start = 0
end = 30

_start:
 
    mov     x19, start    /* initialize loop counter */
loop:
    mov     x0, 1         /* file descriptor: 1 is stdout */
    adr     x1, msg       /* message location (memory address) */
    mov     x2, len       /* message length (bytes) */

    mov     x8, 64        /* write is syscall #64 */
    svc     0             /* invoke syscall */
    add     x19, x19, 1   /* increment the loop counter */
    cmp     x19, end      /* compare to the end value of the loop */
    bne     loop          /* if not equal jump back to the beginning of the loop */

    mov     x0, 0         /* status -> 0 */
    mov     x8, 93        /* exit is syscall #93 */
    svc     0             /* invoke syscall */
 
.data
msg:     .ascii      "Loop!\n"
len=     . - msg
```

First thing we can see is that there are different instructions in this program.
For example, the x86 version had a `inc %r15` to increment the loop counter but
our ARM64 version has a `add x19, x19, 1`. This marks one of the crucial differences
between these two architectures.

Part of the philosophy of the ARM architecture is too keep only the necessary
instructions and not add superfluous ones. For this reason in ARM64 there is
no `inc` instruction, the increment is done by simply adding one to the counter.

On x86 they provide a specialized instruction just increment a value. This is because
x86 is largely a CISC instruction set whereas ARM64 leaning more towards being a
RISC instruction set.

## Printing the counter

Now let's make this program a little bit more interesting. We'll print the loop
counter along with the message so the output will be:

```
Loop: 0
Loop: 1
...
Loop: 29
```

After doing some minor additions to the original program we end up with something
like this:

```asm
.text
.globl    _start

start = 0
end = 30
space = 20 /* ascii space */
asc_zero = 48 /* ascii zero */

_start:
    mov    $start, %r15   /* initialize loop counter */

loop:
    xor    %rdx, %rdx  /* clear rdx */
    mov    %r15, %rax  /* we'll divide the counter */
    mov    $10, %r14   /* by 10 to split the digits */
    div    %r14
    add    $asc_zero, %rdx   /* add '0' to result and remainder */
    mov    %dl, num_offset + 1

    cmp    $0, %al
    je     print_msg          /* skip the second digit */
    add    $asc_zero, %rax
    mov    %al, num_offset    /* put both digits inside the message */

print_msg:
    movq    $len, %rdx    /* message length */
    movq    $msg, %rsi    /* message location */
    movq    $1, %rdi      /* file descriptor stdout */
    movq    $1, %rax      /* syscall sys_write */

    
    syscall

    inc %r15
    cmp $end, %r15
    jne loop

    movq    $0, %rdi       /* exit status */
    movq    $60, %rax      /* syscall sys_exit */
    syscall

.section .data

msg:    .ascii      "Loop:   \n"
    len = . - msg
    num_offset = msg + 6
```

The main additions are in lines 22 to 35. We are now using the division instruction
to split the digits of a decimal number. After that we add '0'(48) to each digit so
we can print it as part of the message. We copy both digits to the message (`num_offset` marks
the location where the numbers should start). Before copying the first digit we check if it's
equal to zero, if it is then we just skip it entirely.

## Printing the counter: ARM64

On the opposite side we have the ARM64 version.

```asm
.text
.globl _start

start = 0
end = 30
asc_zero = 48

_start:
 
    mov     x19, start
loop:
    
    /* split digits */
    mov     x21, 10             /* divisor */
    udiv    x20, x19, x21       /* calculate quotient */
    msub    x22, x20, x21, x19  /* calculate remainder */

    add     x22, x22, asc_zero
    adr     x21, num_offset+1    /* put the offset in a register */
    strb    w22, [x21,0]       /* store the digit in the message */
    cmp     x20, xzr           /* compare with zero register */
    b.eq    print_msg
    add     x20, x20, asc_zero /* add '0' to digit */
    adr     x21, num_offset    /* put the offset in a register */
    strb    w20, [x21,0]       /* store the digit in the message */

print_msg:
    mov     x0, 1
    mov     x0, 1         /* file descriptor: 1 is stdout */
    adr     x1, msg       /* message location (memory address) */
    mov     x2, len       /* message length (bytes) */

    mov     x8, 64         /* write is syscall #64 */
    svc     0              /* invoke syscall */
    add     x19, x19, 1
    cmp     x19, end
    bne     loop

    mov     x0, 0         /* status -> 0 */
    mov     x8, 93        /* exit is syscall #93 */
    svc     0             /* invoke syscall */
 
.data
msg:     .ascii      "Loop:   \n"
len=     . - msg
num_offset= msg + 6
```

This version is slightly more complicated as the ARM64 instruction set
does not provide with an instruction that calculates both the quotient
and the remainder so we need to do it by ourselves in two instructions.
This can be seen in lines 14 through 16.

## Conclusions

The underlying hardware architecture has a huge impact in the way code is
written(or compiled). Some of the differences between two different approaches
are shown in this tiny example.

On one side we have the bloated x86-64 instruction, which aspires to provide
many complicated instructions to facilitate the programmer's job. On the other
side we have ARM64 providing only the minimal set of instructions necessary and
putting the responsibility on the programmer(or compiler) to build more
advanced operations by combining the basic instructions.

Personally I am more accustomed to writing x86 assembler which makes me feel
more comfortable writing x86-64 assembler than ARM64. However I do appreciate
the fact that ARM64 is more logically laid out as it doesn't have to struggle
with decades of backwards-compatibility crutches(hint: the latest Intel CPUs
are still able to run applications compiled for the _original i386_).

I will leave links to two repositories containing the code for both versions.

1. [ARM64](https://github.com/e4lejandr0/loop-arm64)
1. [x86-64](https://github.com/e4lejandr0/loop-x86-64)


