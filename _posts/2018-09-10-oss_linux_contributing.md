---
layout: post
title: "Two Open Source Communities: Linux and KDE"
author: Alex
tags: ['linux', 'opensource', 'oss', 'foss', 'kde']
---
As part of the first assignment for my Software Portability and Optimization class
I've been tasked to approach two open source projects with GPL compatible licenses.

Fortunately for me I've been wanting to contribute to open source software multiple times over the years.
The two projects that I am most interested in are the Linux Kernel and the KDE project. I am an avid
fan of both and I am somewhat familiar with the process of contributing to them.

### The Linux Kernel

- Code Review: Yes, automated linting and manual code review
- Mode of communication: Mailing lists
- Volume of emails per day: in the thousands
- Documentation: Official documentation on how to contribute available in the `Documentation/` folder.

The Linux Kernel is probably one of the most famous open source projects currently alive(sorry GNU) and as such
it can be quite intimidating for a newcomer like me. The main channel of communication used by the kernel are the
numerous mailing lists hosted at `http://vger.kernel.org/`. Currently there are more than 100 mailing lists due to
each kernel subsystem having its own separate list.

This is the first roadblock one would encounter when wanting to contribute to the kernel,
"Where am I supposed to send this patch?". As this question comes over quite a bit from new
contributors some people have decided to set up an unofficial mailing list targeted towards wannabe
contributors.

Because the development of Linux is almost exclusively discussed on mailing lists it is very important
for a possible contributor to get a grasp of how to receive and interact with mailing lists properly.
The main Linux kernel mailing lists receives thousands of emails per day, the communication is really
fast and errors in formatting(or etiquette) can result in your message being completely ignored.

Personally, I've sent a minor patch before which got silently ignored and it is to be expected.

As it can be really hard for newbies to get answers in the official mailing lists a group of people
have set up an unofficial mailing list at [Kernel Newbies](https://kernelnewbies.org/)
which I strongly recommend. It is a pretty good information resource and I can usually see
[Greg Kroah-Hartman](https://en.wikipedia.org/wiki/Greg_Kroah-Hartman) himself answering questions.

Overall the Linux kernel developers are a tightly-knit bunch so before asking a question you will want
to RTFM and Google as much as possible. Once you have proven yourself to the community they are very
responsive and helpful.

### Contributing

In order to contribute to the Linux Kernel the first step is to grab a copy of the Linux source code.
Once you have it you can start hacking away. The kernel itself is written in C and it can look pretty
daunting to a newbie. In order to maximize performance the kernel developers abuse compiler behaviour,
exploit undefined behaviour, implementation specific behaviour and other shenanigans of that nature.
Due to the nature of the code the Kernel only compiles using GCC with `-O2` (no, the kernel doesn't
build without optimizations). 

These are the things you will need to send a basic patch:

- `git`: version control system of the kernel
- a mail client: `mutt` is the preferred mail client of the Linux community
- Some kind of change to the kernel

Setting this up can be quite a process so it is left as an exercise to the reader. You can check the
[official documentation](https://www.kernel.org/doc/html/v4.17/process/submitting-patches.html).

### Code Review: Submit a Patch

Let's assume that you have set up your development environment, got a local copy of the Linux Kernel
and now you want to send this for review. Where do we send this patch and how do we generate it?

Well, the first thing we need to do is generate a patch file from our modified sources. The Linux 
kernel uses git so you should have committed your changes to your local repository. The kernel developers
are really picky with commit messages so you will want to make sure to follow the standard format for
commit messages(this is important, otherwise no one will review your code). 

After we have a properly formatted commit we should generate a patch file by using `git format-patch`
at the kernel source tree. We will end up with a `.patch` file that is basically a universal diff
that can be applied with the `patch` command.

Before sending this patch to the Linux kernel mailing list for review we should run the `checkpatch.pl`
script. This script was made by the kernel devs in order to check for code style and code smell. If 
you get any warnings coming from that script ideally you would fix them before sending your patch
(if you do not do this there is a big chance no one will bother reviewing your code).

Once you have fixed all checkpatch.pl warnings you can send the patch file using your favourite mail
client or even git itself(see `git send-mail`). The review process itself can take weeks and sometimes
the maintainers might miss your patch because of the sheer volume of patches received so it is
important to not have any formatting issues in your code or commit message to maximize the chances of
 getting approved.

When you send your patch to appropriate mailing list you should also CC all the relevant maintainers.
The more people you message the less likely it is you'll patch will get lost.

After sending your patch all you can do is wait. Each maintainer/developer will provide feedback and/or
sign off your patch. You must fix all the feedback and/or defend your technical decisions on the mailing list
to get approval and if you are lucky the correspondent subsystem maintainer will apply their patch to
their tree which will eventually make it to Linus's tree and into the mainstream kernel. Congrats you
are a kernel developer.

This review process can take days or weeks as you address the community's feedback and make changes to your patch.

### Conclusions

The Linux Kernel is definitely not an easy project to contribute to. It requires a lot of technical
background and C proficiency along with learning the rules of community(which are pretty heavily
documented). The community is unwilling to help newbies to some degree. Mostly motivated by the fact
that any programmer at some point has the thoughts "I wanna contribute to the kernel" and the community
can't possibly answer the same questions every time. You will find lots of people silently pointing to
docs but it is a wonderful learning experience.

Personally I have found that the discussions in the kernel mailing list are highly technical and informative
and I wouldn't make it any different. The barrier-of-entry is certainly very high and I believe this keeps
up the level of the discussion at a high level.

I did not expect to write this much so I'll cut it short here and leave KDE for another post.
