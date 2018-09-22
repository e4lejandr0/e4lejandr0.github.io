---
title: "Two Open Source Communities: KDE"
layout: post
tags: ['kde', 'foss', 'contribute', 'opensource']
author: Alex
---
In a [previous blog post]({% post_url 2018-09-10-oss_linux_contributing %})
I set myself to talk about two open source commmunities. I covered the Linux kernel
community and now it's to take a look at the KDE community.

## KDE: K Desktop Environment

KDE is a desktop environment very popular amoung Linux enthusiasts. The KDE project
tries to provide a smooth and uniform dekstop experience that is also highly
customizable.

As part of KDE there are actually hundreds of different projects being developed.
We have a bunch of shared functionality provided by the KDE Frameworks along with
desktop applications that leverage this functionality to provide a fully integrated
experience such as Dolphin, the official KDE file explorer.

The KDE umbrella is really big but for the purposes of this post we will limit ourselves
to Kate, the KDE Advanced Text Editor.

## Introducing Kate

Part of being a desktop environment is to provide all the necessary utilities a user may
need to their day-to-day work. Kate is the part of KDE that provides us with a very nifty
and versatile text editor. 

The functionality in Kate resembles much of what we find in other modern text editors like
Sublime Text or Visual Studio Code. We find ourselves having Syntax highlighting for numerous
programming languages, tab completion, a minimap and even plugin support.

Despite packing so much functionality Kate is really lightweight on resources consuming very
little ram and disk space(a lot of it steams from the fact that it leverages the KDE Frameworks).

<p align="center">
    <img src="https://www.kde.org/images/screenshots/resized/kate.png">
    <i style="display:block">Kate: KDE Advanced Text Editor</i>
</p>

## The Community

The KDE Community is very welcoming of new contributors. We can see a different spirit in
this community than in the Kernel community probably steeming from the fact that they
have very different sizes and funding. The KDE community welcomes anyone who wants to help
as most of the work is done by volunteers whereas most of the kernel contributions come
from paid developers working for the tech giants of the world.

A good demonstration of the welcoming nature of the KDE community is the KDE wiki. They have
set up a wiki page listing all the steps you need to do to start contributing to KDE.

## Get Involved!

In the official [Get Involved!](https://community.kde.org/Get_Involved) page we can see that
there is a huge list of ways you can contribute to KDE and some of them don't require any
coding experience. Things like bug triage, translations and artwork are very welcome contributions.

To become a KDE developer you will need C++ experience as the core functionality of KDE
is written in C++. The KDE does their best to tag bugs as "Junior Jobs" when they believe
that a specific bug is a good starting point from a newbie which is very helpful when
navigating the [KDE Bugtracker](https://bugs.kde.org).

## Get The Code

KDE uses git as its version control system so the approach to get a copy of the KDE source 
code is to clone the right repository. Because the KDE project has many sub-projects you 
should choose one component and focus on it.

A list of available repositories is available [here](https://cgit.kde.org). The repository
for Kate is https://anongit.kde.org/kate.git.

## Building the project

In order to build a KDE project you will need to install cmake as that is the standard
build system used by KDE. Once you have all the requirements you can proceed to clone the
repository and build the project usually through some invocations cmake and make:

```bash
$ git clone https://anongit.kde.org/kate.git # Clone the repo
Cloning into 'kate'...
remote: Counting objects: 127807, done.
remote: Compressing objects: 100% (22724/22724), done.
remote: Total 127807 (delta 95036), reused 126937 (delta 94381)
Receiving objects: 100% (127807/127807), 23.11 MiB | 2.42 MiB/s, done.
Resolving deltas: 100% (95036/95036), done.
$ cd kate && cmake . # Generate the Makefiles
# Lots of cmake output
$ make -j12 # Build the project
```

## Submitting A Patch

The KDE community has recently moved to [Phabricator](https://phabricator.kde.org/)
for code review. That means that after you successfully modified a project and would
like to push your changes upstream you will need to register for a Phabricator account
and the whole code review process will be done there.

After you post your patch on Phabricator you will have to wait for reviews from other KDE developers which may leave comments and feedback that you will have to address. Your code
should not cause regressions and pass all tests in the KDE projects that have automated testing.

The standard for patches in KDE are much more relaxed compared to the Linux kernel as is
expected when you are working at the application level instead of the kernel level.

## Conclusions

The KDE Community is very welcoming for newbies and they appreciate all the help they can
get. They have options for contributing even if code is not your strong-suit and the code
review process is open and accessible. For all this reasons I would say that the KDE
project is a great way to get started contributing to Open Source Software.


This is it for now, next time we'll analyze a KDE patch in depth.

