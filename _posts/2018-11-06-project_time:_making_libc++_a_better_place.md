---
title: "Project Time: Making libc++ a *slightly* better place"
layout: post
tags: ['libc++', 'project']
author: Alex
---

As part of my SPO600 course I have been tasked to choose an open source
that I can optimize(to any measurable degree) for the ARM64 architecture.

To optimize a piece of software we have been given a few options in class:

1. Crank up compiler optimizations: If can change the build process to use
higher optimization settings we could potentially some performance gains.
2. Change the underlying algorithms in the code: Changing a bubble sort
for a quick sort would speed things up, for example.
3. Reorganize/Rewrite code to allow for better compiler optimizations:
For example, rewriting a loop to allow the vectorizer to kick-in
4. Write inline assembler for a specific platform: For example, replacing
a critical function for hand-written assembly

For my project I will be  most likely using a mixture of options 2, 3 and 4. I believe the llvm guys
are probably using an optimum build process(though to be fair, I have not checked) so option
1 does not seem worth pursuing.

As libc++ is a _huge_ project I will be focusing mostly in the regular expressions engine. It is
somewhat widely known that `std::regex` is not as fast as it could be so that seems like a natural
place to focus my energy(_hopefully_ the C++ doesn't limit the possible optimizations).

# The outline

The outline of what I will be doing:

1. Checkout the source of the project
2. Benchmark the project to obtain a baseline performance results
3. Apply optimizations
4. Verify correctness of the results
5. Benchmark again and compare against our baseline

# The Benchmark

For benchmarking I will conduct all my tests in a Raspberry Pi 3 B+.
These are the specs that I'll be working with:

```
SoC: Broadcom BCM2837B0 quad-core A53 (ARMv8) 64-bit @ 1.4GHz
GPU: Broadcom Videocore-IV
RAM: 1GB LPDDR2 SDRAM
Storage: SanDisk Class 10 64GB SD-Card
```
And I will also be using my desktop computer to ensure that I have not made anything worse
in `x86-64`. Specs:

```
CPU: AMD Ryzen 5 1500 @ 3.0Ghz
GPU: Nvidia GTX1060 3GB
RAM: 8GB DDR4 (slightly overclocked)
Storage: 250GB SSD + 1TB HDD
```

## The data

For the benchmark I will use the test suite provided by the `libc++` project. For
further testing, if needed, I will try to repurpose the test suite provided by
[ripgrep](https://github.com/BurntSushi/ripgrep). ripgrep is a regular expressions
tool that is focused on being really fast and as such they have a very complete
test suite full of problematic regexes.

This should give me ample testing data to work with.

# The environment

For this project I will probably be using a container-based workflow(or chroot-based, we'll see).
Creating a new container will allow me to completely separate my testing environment from my personal
environment and I don't have to deal with `LD_PRELOAD` and friends.

If I do use a container-based workflow I will be using Docker + Alpine Linux. If I decide to use
a chroot-based environment I will use a gentoo stage3 tarball as my userspace. I will be replacing
the container's libc++ with my own for testing purposes.

This 
