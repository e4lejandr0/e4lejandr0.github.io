---
title: "Assembly code in LAME"
layout: post
tags: ['nasm', 'lame', 'mp3', 'encoder']
author: Alex
---

Hello, in this blog post I will analyze the source code of
[LAME: Lame Ain't an MP3 Encoder](https://sourceforge.net/p/lame/svn/HEAD/tree/).
A media encoder has particular performance requirements when encoding audio performance
is second to compression ratio but when it comes to decoding performance is of the utmost
importance. If our decoder takes longer than a frame to decode then we will skip a frame
a the animation(or audio) will become choppy and give a poor user experience.

Because performance can impact the user experience negatively we encounter that most popular
media encoders and decoders are optimized for the target platforms by using a variety of
nifty tricks(exploiting what humans can hear and see) and some assembler.

On this blog post I'll focus on how assembler was used in LAME to optimize it for various
platforms.

# What is LAME?

LAME stands for "Lame Ain't an MP3 Encoder". The name being a recursive acronym is a little
tongue-in-cheek comment resembling the likes of GNU("Gnu is Not Unix!") which I find endearing.
Despite its LAME is actually an MP3 encoder(who would've known?!) and a very good one at that.

The project is currently maintained by [Rogério Brito](www.ime.usp.br/~rbrito/),
[Robert Hegermann](https://sourceforge.net/u/robert/profile/) and
[Alexander Leidinger](https://sourceforge.net/u/aleidinger/profile/) and it aims to be the
best possible MP3 encoder for low-to-mid bit-rates.

This piece of software is written mostly in C and it seems to me an autoconf based project.

# Getting the source

To retrieve the source code of LAME I checked out the official SVN trunk located
[here](https://svn.code.sf.net/p/lame/svn/trunk/lame lame-svn). After SVN is done I end up
with the following directory structure:

```
.
├── acinclude.m4
├── aclocal.m4
├── ACM
├── API
├── ChangeLog
├── ChangeLog.header
├── compile
├── config.guess
├── config.h.in
├── configMS.h
├── config.rpath
├── config.sub
├── configure
├── configure.in
├── COPYING
├── debian
├── DEFINES
├── depcomp
├── Dll
├── doc
├── dshow
├── frontend
├── HACKING
├── include
├── INSTALL
├── INSTALL.configure
├── install-sh
├── lame.bat
├── lame.spec.in
├── libmp3lame
├── LICENSE
├── ltmain.sh
├── mac
├── macosx
├── make_changelog.sh
├── Makefile.am
├── Makefile.am.global
├── Makefile.in
├── Makefile.MSVC
├── Makefile.unix
├── misc
├── missing
├── mpglib
├── README
├── README.WINGTK
├── STYLEGUIDE
├── test
├── testcase.mp3
├── testcase.wav
├── TODO
├── USAGE
└── vc_solution
```

We see the first hint that this is an autoconf-based project when we look at the `Makefile.am` file.
Now let's try and see if there's any file containing assembler. A quick check tells me that in fact
we do have some assembler files:

```bash
$ find . -name '*.[sS]' | wc -l
0  # No files by extension '.s' or '.S'
$ find . -name '*.nas' | wc -l
8 # Some files with extension 'nas' probably for the NASM assembler
$ find . -name '*.nas' # Let's take a look at the filenames
./libmp3lame/i386/fftsse.nas
./libmp3lame/i386/fftfpu.nas
./libmp3lame/i386/fft3dn.nas
./libmp3lame/i386/scalar.nas
./libmp3lame/i386/fft.nas
./libmp3lame/i386/ffttbl.nas
./libmp3lame/i386/choose_table.nas
./libmp3lame/i386/cpu_feat.nas
```

Okay so at first I thought of checking for files ending in `.s` or `.S` but that gave no results.
In this project they seem to be using NASM and they have named their assembly files with the extension
`.nas`. We see that we have some files specific to the `x86` architecture written in NASM.

At first glance it seems that they have not optimized this package for any other platform but we
are not counting inline assembler and optimized C code in this view.

A quick comparison we can see that the assembler in the `.nas` files only corresponds to less than
10% of the whole codebase:

```bash
$ find . -name '*.nas' | xargs wc -l
  422 ./libmp3lame/i386/fftsse.nas
  619 ./libmp3lame/i386/fftfpu.nas
  488 ./libmp3lame/i386/fft3dn.nas
 1022 ./libmp3lame/i386/scalar.nas
  267 ./libmp3lame/i386/fft.nas
   78 ./libmp3lame/i386/ffttbl.nas
  447 ./libmp3lame/i386/choose_table.nas
  107 ./libmp3lame/i386/cpu_feat.nas
 3450 total
$ find . -name '*.c' | xargs wc -l
    403 ./mpglib/layer2.c
    152 ./mpglib/tabinit.c
    224 ./mpglib/decode_i386.c
    232 ./mpglib/layer1.c
    348 ./mpglib/dct64_i386.c
    364 ./mpglib/common.c
    718 ./mpglib/interface.c
   1969 ./mpglib/layer3.c
      7 ./mac/MacDLLMain.c
    139 ./frontend/amiga_mpega.c
    331 ./frontend/gpkplotting.c
    503 ./frontend/main.c
    382 ./frontend/brhist.c
    661 ./frontend/lame_main.c
   2673 ./frontend/parse.c
    370 ./frontend/rtp.c
    149 ./frontend/lametime.c
    340 ./frontend/console.c
   2306 ./frontend/get_audio.c
     65 ./frontend/mp3x.c
    439 ./frontend/timestatus.c
    269 ./frontend/mp3rtp.c
   1645 ./frontend/gtkanal.c
   1375 ./libmp3lame/takehiro.c
    404 ./libmp3lame/presets.c
    574 ./libmp3lame/encoder.c
   2167 ./libmp3lame/psymodel.c
    564 ./libmp3lame/tables.c
   1082 ./libmp3lame/VbrTag.c
   1111 ./libmp3lame/bitstream.c
    476 ./libmp3lame/gain_analysis.c
   2050 ./libmp3lame/quantize.c
    477 ./libmp3lame/mpglib_interface.c
   1926 ./libmp3lame/id3tag.c
   1039 ./libmp3lame/newmdct.c
   2346 ./libmp3lame/set_get.c
    240 ./libmp3lame/vector/xmm_quantize_sub.c
    254 ./libmp3lame/version.c
   1580 ./libmp3lame/vbrquantize.c
   2665 ./libmp3lame/lame.c
    293 ./libmp3lame/reservoir.c
   1019 ./libmp3lame/util.c
    339 ./libmp3lame/fft.c
   1074 ./libmp3lame/quantize_pvt.c
   1028 ./Dll/BladeMP3EncDLL.c
    166 ./misc/scalartest.c
   1323 ./misc/abx.c
    220 ./misc/mlame_corr.c
    839 ./misc/ath.c
  41320 total
```

Because the bulk of the code is C I believe it is reasonable to assume that most of the optimization
is being done at the C code level and they are only using pure assembler where needed. After looking
down further I have reached the conclusion that this project does not utilize assembler heavily.

# Assembler for i386

Before we saw a couple folders that contain assembler for the `i386` architecture. The assembler in this
case is being used to speed up calculations on that platform if `nasm` can be found at compile time when
compiling for this platform. I looked at the source code `fht.nas` and quickly found out that I can't read
that to any usable degree but I was able to see that they export a symbol `fht`:

```asm
globaldef fht_3DN
globaldef fh 
```

So I proceeded to look for a an `fht()` function of some sort(a quick way of doing it is `grep -R 'fht(' .`)
which led to me the `fht.c` file that explains what the function does:

```c
/*
**  fht(fz,n);
**      Does a hartley transform of "n" points in the array "fz".
*/
```

So we can reasonably expect that the assembler version does the same but it uses `x86` specific instructions
to get better performance. Okay so we are able to do "hartley transforms" really fast but why would we need
this in x86 and not anywhere else?

# Why is this needed?

I am going to go out on a wild guess here and I'll say that this assembler was put in place when `x86` was
the main computing platform(before it was superseded by `x86_64`) and as such it made sense to optimize for it.
Back then a computer could have performance issues when encoding/decoding audio(think a Pentium 1 decoding a
192kbps mp3 file). However as computers became faster there simply wasn't a need to optimize this package further
(or at least not at the assembly level) and no further assembly was put in place.

I tried to get something to backup my guess by looking at the SVN log but sadly I wasn't able to find anything
substantial but I'll leave that out there maybe someone knows better :)
