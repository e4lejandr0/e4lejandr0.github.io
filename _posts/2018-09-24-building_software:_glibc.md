---
title: "Building Software: GLIBC"
layout: post
tags: ['glibc', 'c', 'linux', 'foss', 'open source']
author: Alex
---

All right I have previously talked about how to build the Linux Kernel.
Today I'll go over how to build and test the GNU C Library.

# Getting the source code

As usual the first step is to obtain a copy of the source.  This time we
will get the tarball of the source code to obtain the latest release.
The version number is `2.28`.

```bash
$ curl https://ftp.gnu.org/gnu/glibc/glibc-2.28.tar.xz | tar-Jxvf - # download tarball and extract in current directory
...
$ ls
abi-tags        conform         grp        libof-iterator.mk  mathvec        resource        sunrpc
aclocal.m4      COPYING         gshadow    LICENSES           misc           rt              support
argp            COPYING.LIB     hesiod     locale             NEWS           Rules           sysdeps
assert          crypt           htl        localedata         nis            scripts         sysvipc
benchtests      csu             hurd       login              nptl           setjmp          termios
bits            ctype           iconv      mach               nptl_db        shadow          test-skeleton.c
catgets         debug           iconvdata  MAINTAINERS        nscd           shlib-versions  time
ChangeLog       dirent          include    Makeconfig         nss            signal          timezone
ChangeLog.old   dlfcn           inet       Makefile           o-iterator.mk  socket          version.h
config.h.in     elf             INSTALL    Makefile.in        po             soft-fp         wcsmbs
config.log      extra-lib.mk    intl       Makerules          posix          stdio-common    wctype
config.make.in  gen-locales.mk  io         malloc             pwd            stdlib
configure       gmon            libc-abis  manual             README         streams
configure.ac    gnulib          libio      math               resolv         string
```
# Configure Project

This project uses GNU autotools for its build system. To build an autotools-based project we first need
to call the configure script and then call `make`.

```bash
# Let's create an out-of-source build directory
glibc-2.28 $ mkdir ../glibc-2.28-build && cd ../glibc-2.28-build 
# Call the configure script
glibc-2.28-build $ ../glibc-2.28/configure 
...
glibc-2.28-build $ make -j13
```

The configure script will test out with features are available in your C compiler and set up the toolchain
with the right compiler flags to compile to the target platform. After we have configured the project we
just build it by calling `make`.

# Testing the new library

After libc has been compiled we need to create a simple program to actually test it. In this case I will
use a simple "Hello World!":

```c
#include <stdio.h>

int main(void)
{
	printf("Hello World\n");
	return 0;
}
```

As expected if we compile and run this program we get the "Hello World!" message printed to the screen.
Now let's make it a bit more interesting and let's change glibc. I will make it so that `printf()` will
replace all the `l` characters for `x` so "Hello World!" should become "Hexxo Worxd!".

This is a naive patch that achieves that effect:

```diff
20a21,22
> #include <stdlib.h>
> #include <string.h>
31a34,45
>   size_t fmt_len = strlen(format);
>   char* new_format = malloc(fmt_len+1);
> 
>   for(size_t i = 0; i < fmt_len; ++i) {
>     if(format[i] == 'l') {
>       new_format[i] = 'x';
>     }
>     else {
>       new_format[i] = format[i];
>     }
>   }
> 
33c47
<   done = vfprintf (stdout, format, arg);
---
>   done = vfprintf (stdout, new_format, arg);
34a49
>   free(new_format);
```

Now to test the new libc we've got to link against it. For some unknown(to me) reason the official
documentation at https://sourceware.org/glibc/wiki/Testing/Builds is not working for me. When I try
to execute the `testrun.sh` script that comes with glibc I get a wonderful `error while loading shared
libraries: hello: cannot open shared object file`.

Because the official instructions did not work I've worked around this issue by overriding the `-rpath` of the
executable by passing the `-Wl,-rpath=` flag to the compiler.

I have build a Makefile to encapsulate all these details. By executing `make test` I can see that my little
program is compiled and executed against the system libc and the one I just compiled:

```bash
$ make
cc  main.c -o bin/hello.system
cc  -Wl,-rpath=/home/akdev/Playground/glibc-2.28-build:/home/akdev/Playground/glibc-2.28-build/math:/home/akdev/Playground/glibc-2.28-build/elf:/home/akdev/Playground/glibc-2.28-build/dlfcn:/home/akdev/Playground/glibc-2.28-build/nss:/home/akdev/Playground/glibc-2.28-build/nis:/home/akdev/Playground/glibc-2.28-build/rt:/home/akdev/Playground/glibc-2.28-build/resolv:/home/akdev/Playground/glibc-2.28-build/crypt:/home/akdev/Playground/glibc-2.28-build/nptl:/home/akdev/Playground/glibc-2.28-build/dfp -Wl,--dynamic-linker=/home/akdev/Playground/glibc-2.28-build/elf/ld.so main.c -o bin/hello.new
$ make test
Executing executable linked system libc:
Hello World!
Executing executable compiled libc:
Hexxo Worxd!
```

Note that the second time the `l` characters have been change to `x`. We have successfully compiled and modified glibc. 
