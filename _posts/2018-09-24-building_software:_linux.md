---
title: "Building Software: Linux"
layout: post
tags: [Linux, building, 'Kbuild']
author: Alex
---
Hello, in this blog post I will go through the process of cloning
and building the Linux Kernel. I will be using the `linux-next` branch.

# Getting the source code

The first step to build Linux is to obtain the source code. The easiest
way of getting the source code of Linux is to clone the git repo hosted
at https://git.kernel.org. We checkout Linus's branch:

```bash
$ git clone https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git
Cloning into 'linux'...
remote: Counting objects: 6248248, done.
remote: Compressing objects: 100% (977/977), done.
remote: Total 6248248 (delta 884), reused 843 (delta 567)
Receiving objects: 100% (6248248/6248248), 1.05 GiB | 3.54 MiB/s, done.
Resolving deltas: 100% (5254673/5254673), done.
Checking out files: 100% (61732/61732), done.
```

Linus's branch is where the kernel releases come from so by cloning it
we end up with a copy of the latest kernel release. At the time of this post
the version number is `4.19-rc5`(quick note:`-rc5` was released yesterday by
Greg KH as Linus has stepped down temporarily from Kernel Maintenance).

## Getting the code from linux-next

Now we've got the kernel source but I would like to build the `linux-next` branch
which contains day-to-day changes of the code unlike the latest release which tends to
be more stable. Some more git plumbing is required:

```bash
$ git remote add https://git.kernel.org/pub/scm/linux/kernel/git/next/linux-next.git # Add the linux-next remote
...
$ git fetch linux-next                           # fetch the contents in the 'linux-next' remote
...
$ git fetch --tags linux-next                    # and the tags as well
...
$ git checkout -b 'spo600-build' 'next-20180924' # checkout a new branch based on today's linux-next
```

After this we'll end up in with a local branch 'spo600-build' which is a copy of the latest `next-`
(at the time of this post anyway). Now it's time to build it!

# Configuring the kernel

The Linux kernel is a highly configurable piece of software. The kernel itself comes with several
configuration tools(both graphical and command-line based(TUI)). The easiest way of building the kernel
is to accept the defaults set by upstream by doing `make defconfig` however that build is not guaranteed
to work on any given hardware. For this reason I will use the kernel configuration of my current system.

```bash
/usr/src/linux $ make O=../linux-spo600-build defconfig # create build directory
/usr/src/linux $ cd ../linux-spo600-build               
/usr/src/linux $ cp /boot/config-$(uname -r) .config    # copy the current config
```

The first line of this snippet is creating a build directory for our kernel. The Linux kernel supports
out-of-source builds which means we can build the kernel in a separate directory from the source. This 
comes in handy when testing different kernel versions or configurations as each one can have it's own
build directory.

After we create the build directory with the default settings we copy the configuration of the kernel
that is currently running. In my system this config file is in `/boot/config-$(uname -r)`(the `$(uname -r)` expands to the current version of my kernel) so I copy it to `.config`.

# Enough already, let's build the kernel

Finally to compile the kernel all we need to do is use the `make` command. Specifying the number of jobs
will surely decrease compiles times in a multi-core system:

```bash
/usr/src/linux $ make -j13   # use the 12 cores on my ryzen :)
... # lots of build output!
```

The compilation process can take a while depending on your hardware. For reference it has taken more than
one hour on my laptop(8GB of RAM, i7 7500U) and roughly around twenty minutes on my desktop(8GB of RAM,
Ryzen 1600).

# Testing the kernel

The least disruptive way of testing the kernel is firing up a qemu instance. Qemu allows to  boot directly
from the linux image file(usually named `bzImage`).

```bash
# We pass the -kernel flag and we also need to give the VM a hard drive with a root filesystem
qemu -kernel ./arch/boot/x86/bzImage -hd0 linuxhd.img
```

After doing this a qemu instance should pop up booting the new kernel. The root filesystem must have a properly
laid out unix filesystem and a working init system(I tend to use gentoo stage-3 as user space) or the kernel will
simply just panic. 
