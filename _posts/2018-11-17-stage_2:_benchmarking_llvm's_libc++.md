---
title: "Stage 2: Benchmarking LLVM's libc++"
layout: post
tags: []
author: Alex

[Last post]() I introduced the project that I have been tasked this term.
I need to optimize a project for the `aarch64` architecture. I chose to work
on LLVM's libc++ which is the implementation of the standard C++ library that
is distributed along with `clang`.

For the second stage of this project we are supposed to do some benchmarks to
look for hotspots and get a baseline of what the software works.

I'll walk you through what I have done so far.

# Building the library

To build libc++ I went to the [official documentation]() and followed the steps
to get a working copy of the llvm SVN trunk alongside with the source code of 
`libcxx`.

I did this steps in a docker container so I put the source code in the canonical
location `/usr/local/src`:

```bash

code here 
```

The source code for libc++ ends up living in `/usr/local/src/llvm/projects`. If we
look around we'll see that this is a cmake based project. In order to keep the source
code clean (so I can do several builds if necessary) I created a folder in `/usr/local/src/llvm-x86` for my `x86_64` build:

```bash

$ mkdir -p /usr/local/src/llvm-x86
$ cd /usr/local/src/llvm-x86
$ cmake ../llvm -DCMAKE_INSTALL_PREFIX=/usr/local # Install library in /usr/local

```

That will generate all the makefiles necessary to build llvm and libcxx as part of it.
I can build it by running `make cxx`:

```bash
build output
```

# Testing libc++

In the `libc++` project we have a series of tests to verify the behaviour of the library.
So naturally after building my own version of `libc++` I have to make sure that it actually
works as expected. There is a make target to run the test suite `make check-cxx`.
This can take a couple minutes as it runs 6113 tests. On my computer it takes roughly
six minutes.

After the command runs we get a report of all the test results:


Perfect, it seems that it works properly.

# Benchmark

For my project I have chosen to focus on the regular expression part of the standard
library, namely `std::regex` and friends. For the purpose of benchmarking I have created
a very simple `grep`-like program:


