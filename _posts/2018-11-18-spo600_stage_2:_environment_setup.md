---
title: "SPO600 Stage 2: Environment Setup"
layout: post
tags: ['docker', 'libc++', 'project', 'stage-2']
author: Alex
---

In a previous blog post I talked about my project for SPO600. I chose to
work on libc++ which is LLVM's C++ standard library implementation. In this
blog post I will cover the environment in which I will be working on.

# Hardware

In the previous blog I said I will conduct my development and tests on a
Raspberry Pi 3 Model B(aarch64) and also on my personal desktop computer(x86\_64).
I will repeat the hardware specs of both devices here for completeness:

```yaml
Model: Raspberry Pi 3 Model B
RAM: 1GB
CPU: Quad Core 1.2Ghz Broadcom BCM2837 (Cortex A54 x4)
Storage: 64GB Class 10 SanDisk SD Card
```

```yaml
Model: Custom Built PC
RAM: 16GB
CPU: Six Core AMD Ryzen 1600 @ 3.5Ghz (with HT enabled)
Storage: 250 Samsung Evo SSD, 1 TB Samsung HDD, 1 TB Western Digital HDD
```

These two sets of hardware allow me to test my builds on both architectures: `aarch64`
and `x86_64`

# Software

For simplicity I have chosen to run everything on a single operating systems. I have chosen
Fedora 29. I have made no customization other installing the necessary software for building
software.

On my desktop computer I have opted for making a docker-based environment to keep my
host system clean. This is the `Dockerfile` that I used:

```docker
FROM fedora:latest

# Update packages
RUN echo "fastestmirror=true" >> /etc/dnf/dnf.conf
RUN dnf update -y

# Install development tools
RUN dnf install clang svn gcc libxml2-devel cmake make perf -y

WORKDIR /usr/local/src

# Get LLVM source code
RUN svn co http://llvm.org/svn/llvm-project/llvm/trunk llvm

WORKDIR /usr/local/src/llvm/projects

# Get libcxx and libcxx-abi
RUN svn co http://llvm.org/svn/llvm-project/libcxx/trunk libcxx
RUN svn co http://llvm.org/svn/llvm-project/libcxxabi/trunk libcxxabi

WORKDIR /usr/local


# Leave a bash shell running so we can attach to it
CMD /usr/bin/bash --login
```

The source code for LLVM and libc++ is downloaded into `/usr/local/src` and the build
lives on `/usr/local/src/llvm-build`. At build time the `CMAKE_INSTALL_PREFIX` is set to
`/usr/local` this way I don't break the container when running `make install-cxx`.

On my Raspberry Pi I have opted for not using docker. The overhead of docker may be impact
performance too much for my tastes so I have just cloned a copy of LLVM into my home directory.

The libraries will be installed in `/home/akdev/llvm-install`.

# Compilation process

In order to test my builds of libc++ I have created a small test program. It is a very naive
version of the `grep` command. In order to make sure that my test program is using the correct
version of `libc++` I have overridden the `rpath` with the `-Wl,-rpath=/usr/local/lib` option.

I will compile the executable with the following flags:

```bash
       # Hardcode rpath
clang++ -Wl,-rpath=/usr/local/lib \ 
       # Link against libc++
	-stdlib=libc++ \
       # Override linker's library search path
	-L/usr/local/lib \
       # Override include search path
        -I/usr/local/include \
       # Optimize for debugging
	-0g \
       # Keep debug symbols for perf
	-g \
       # Use the latest standard
	-std=c++17 \
	-o bin/bench \
	bench.cpp
```

At the end of this compilation I will have an executable that is linked against the correct
libc++ version and has used the correct includes as well.(obviously the paths will change in
the raspberry pi where the build lives in my home directory).


This is the environment that I will be working on. Next blog post I'll talk about the benchmark
program and we can take a look at some profiling information.
