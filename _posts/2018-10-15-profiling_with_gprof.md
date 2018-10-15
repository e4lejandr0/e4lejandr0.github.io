---
title: "Profiling with gprof"
layout: post
tags: ['profiling', 'gprof']
author: Alex
---
One of the key points when doing software optimization is that
you must know where the bottlenecks in your program are. It would
make very little sense to spend a lot of time optimizing a function
that only makes up for ~1% of the runtime. But how can we know which
functions are critical for performance? This is where the different
profiling tools come in.

# What is profiling?

First we have to touch on the definition of profiling. From Wikipedia:

>profiling ("program profiling", "software profiling") is a form of
>dynamic program analysis that measures, for example, the space (memory)
>or time complexity of a program, the usage of particular instructions,
>or the frequency and duration of function calls.
[source](https://en.wikipedia.org/wiki/Profiling_\(computer_programming\))

Let's digest this definition a bit: `profiling is a form of analysis that
measures the space(memory) or time complexity of a program`. From this
simplified definition we can see that profiling is just measuring either
how much memory a program uses(space) or how long does it take to run (time).
It's worth noting that we can profile for other variables other than space
and time but we will be focusing on these two.

# Tools

In order to profile a program we must use a _profiler_. Two well known ones
are the GNU Profiler(`gprof`) and `valgrind`. The GNU profiler comes with a
standard distribution of `gcc` which makes it readily available. Valgrind on
the other hand is usually a separate package(usually available from your distro's
repositories). These two profilers use wildly different approaches.

The GNU Profiler uses code injected at compile-time to measure the length of each
function call as well as frequency. The advantage of this approach is that there
is less of a performance penalty when doing profiling which should gives us more
realistic results.

In contrast, the `valgrind` tool injects itself into the program at runtime (not
unlike a debugger does) and does measurements that way. This does cause the execution
time of the program to get a lot longer when comparing against non-profiled runs.

In either case we have that the _profiler itself will alter the runtime of our program_
and this is something we must keep in mind when reading profiling results. We care about
the relative time spent in each function rather than the absolute timings provided by the
profiler.

# The Program

I will try to show how to use `gprof` to get timings on the following program:

```c
#include <stdio.h>
#include <stdlib.h>
#include <errno.h>

#define WRONG_ARGS 1
#define FILE_ERR 2

#define BUF_SIZE 4096

int copy(FILE* src, FILE* dest)
{
	char buffer[BUF_SIZE];
	size_t bytesRead = 0;
	size_t bytesWritten = 0;

	do {
		bytesRead = fread(buffer, sizeof(char), BUF_SIZE, src);
		bytesWritten = fwrite(buffer, sizeof(char), bytesRead, dest);
	} while(!feof(src) && !ferror(src) && !ferror(dest));

	return ferror(src) || ferror(dest);
}

int main(int argc, char** argv)
{
	if(argc != 3) {
		fprintf(stderr, "Usage: %s <src> <dest>\n", argv[0]);
		return WRONG_ARGS;
	}

	const char* destPath = argv[2];
	const char* srcPath = argv[1];
	FILE* src = fopen(srcPath, "r");
	FILE* dest = fopen(destPath, "w");

	if(src == NULL || dest == NULL) {
		perror("could not open file");
		return FILE_ERR;
	}
	
	printf("%s -> %s\n", srcPath, destPath);
	int failure = copy(src, dest);
	if(failure) {
		perror("could not copy file");
	}

	return 0;
}
```

This is a very simple program that copies a file into another. Similar to the `cp` command.
In order to try it we can generate a decently sized file with this command:

```bash
dd if=/dev/zero of=/path/to/file bs=1M count=1024
```

This will generate a file of 1GB in size located at `/path/to/file`. I have put this in a Makefile
and will post the github link at the end of the post in case you would like to try this yourself.

# Getting profile data

So now that we have a program and we compile and test it by doing:

```bash
$ gcc cp.c -o cp
$ ./cp /path/to/source /path/to/destination
```

This may take a bit depending on the size of the file, with 1GB of data it takes a few seconds on
my laptop(i7-7200U, 8GB of RAM, 1TB SSD).

Alright but now how can we start profiling this program? The first thing we need to do is to compile
the program with the profiling code enabled. The GNU Profiler needs code added to the program to
measure each function call. A downside of this approach is that we need to recompile our program
if we want to profile it.

We must add the `-pg` flag to out command line:

```bash
$ gcc cp.c -pg -o cp
```
Then we need to run the program as usual; this will generate a `gmon.out` file which contains all
the statistics we need. We can read the `gmon.out` file by using the `gprof` command and passing the
related executable to it.

```bash
$ gcc cp.c -pg -o cp                 # Let's compile the program with profiling enabled
$ ./cp /etc/passwd /tmp/passwd       # Run it to generate timing data
/etc/passwd -> /tmp/passwd
$ ls                                 # Let's see if gmon.out was generated
cp.c cp gmon.out
$ gprof cp                           # Read the timing data and show statistics
Flat profile:

Each sample counts as 0.01 seconds.
  %   cumulative   self              self     total           
 time   seconds   seconds    calls  ms/call  ms/call  name    
100.43      0.01     0.01        1    10.04    10.04  copy

 %         the percentage of the total running time of the
time       program used by this function.

cumulative a running sum of the number of seconds accounted
 seconds   for by this function and those listed above it.

 self      the number of seconds accounted for by this
seconds    function alone.  This is the major sort for this
           listing.

calls      the number of times this function was invoked, if
           this function is profiled, else blank.

 self      the average number of milliseconds spent in this
ms/call    function per call, if this function is profiled,
	   else blank.

 total     the average number of milliseconds spent in this
ms/call    function and its descendents per call, if this
	   function is profiled, else blank.

name       the name of the function.  This is the minor sort
           for this listing. The index shows the location of
	   the function in the gprof listing. If the index is
	   in parenthesis it shows where it would appear in
	   the gprof listing if it were to be printed.

Copyright (C) 2012-2017 Free Software Foundation, Inc.

Copying and distribution of this file, with or without modification,
are permitted in any medium without royalty provided the copyright
notice and this notice are preserved.

		     Call graph (explanation follows)


granularity: each sample hit covers 2 byte(s) for 99.57% of 0.01 seconds

index % time    self  children    called     name
                0.01    0.00       1/1           main [2]
[1]    100.0    0.01    0.00       1         copy [1]
-----------------------------------------------
                                                 <spontaneous>
[2]    100.0    0.00    0.01                 main [2]
                0.01    0.00       1/1           copy [1]
-----------------------------------------------

 This table describes the call tree of the program, and was sorted by
 the total amount of time spent in each function and its children.

 Each entry in this table consists of several lines.  The line with the
 index number at the left hand margin lists the current function.
 The lines above it list the functions that called this function,
 and the lines below it list the functions this one called.
 This line lists:
     index	A unique number given to each element of the table.
		Index numbers are sorted numerically.
		The index number is printed next to every function name so
		it is easier to look up where the function is in the table.

     % time	This is the percentage of the `total' time that was spent
		in this function and its children.  Note that due to
		different viewpoints, functions excluded by options, etc,
		these numbers will NOT add up to 100%.

     self	This is the total amount of time spent in this function.

     children	This is the total amount of time propagated into this
		function by its children.

     called	This is the number of times the function was called.
		If the function called itself recursively, the number
		only includes non-recursive calls, and is followed by
		a `+' and the number of recursive calls.

     name	The name of the current function.  The index number is
		printed after it.  If the function is a member of a
		cycle, the cycle number is printed between the
		function's name and the index number.


 For the function's parents, the fields have the following meanings:

     self	This is the amount of time that was propagated directly
		from the function into this parent.

     children	This is the amount of time that was propagated from
		the function's children into this parent.

     called	This is the number of times this parent called the
		function `/' the total number of times the function
		was called.  Recursive calls to the function are not
		included in the number after the `/'.

     name	This is the name of the parent.  The parent's index
		number is printed after it.  If the parent is a
		member of a cycle, the cycle number is printed between
		the name and the index number.

 If the parents of the function cannot be determined, the word
 `<spontaneous>' is printed in the `name' field, and all the other
 fields are blank.

 For the function's children, the fields have the following meanings:

     self	This is the amount of time that was propagated directly
		from the child into the function.

     children	This is the amount of time that was propagated from the
		child's children to the function.

     called	This is the number of times the function called
		this child `/' the total number of times the child
		was called.  Recursive calls by the child are not
		listed in the number after the `/'.

     name	This is the name of the child.  The child's index
		number is printed after it.  If the child is a
		member of a cycle, the cycle number is printed
		between the name and the index number.

 If there are any cycles (circles) in the call graph, there is an
 entry for the cycle-as-a-whole.  This entry shows who called the
 cycle (as parents) and the members of the cycle (as children.)
 The `+' recursive calls entry shows the number of function calls that
 were internal to the cycle, and the calls entry for each member shows,
 for that member, how many times it was called from other members of
 the cycle.

Copyright (C) 2012-2017 Free Software Foundation, Inc.

Copying and distribution of this file, with or without modification,
are permitted in any medium without royalty provided the copyright
notice and this notice are preserved.

Index by function name

   [1] copy
```

As we can see the output of gprof is quite extensive. It gives us a table
of all the functions called in our program along with relative and absolute
timings for each one. From the output above, we can see the program spends
100% of its runtime in the `copy()` function. If we were to optimize this
tiny program this is where we should start.

`gprof` will give a count of how many times a function was called, allowing
us to quickly spot which functions are part of the "hot path" and which ones
we can safely ignore when optimizing.

# Conclusions

We can see that profiling is vital when it comes to optimizing software. It
allows us to quickly identify where we should be spending our time to get the
best results.

The source code can be found on [github](https://github.com/e4lejandr0/cp-profile).
