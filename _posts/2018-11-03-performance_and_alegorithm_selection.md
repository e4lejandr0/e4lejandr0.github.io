---
title: "Performance and algorithm selection"
layout: post
tags: []
author: Alex
---

Today I will be talking about the importance of selecting the correct algorithm
when trying to optimize a piece of software. In this article I will not talk
about algorithmic complexity but rather of very clever optimizations that can be
achieved by understanding the underlying hardware and or the compiler.

# The code

We will be using a small piece of code provided by my professor Chris Tyler. 
This is the original, unoptimized, software:

```c
#include <stdlib.h>
#include <stdio.h>
#include <stdint.h>
#include "vol.h"

// Function to scale a sound sample using a volume_factor
// in the range of 0.00 to 1.00.
static inline int16_t scale_sample(int16_t sample, float volume_factor) {
	return (int16_t) (volume_factor * (float) sample);
}

int main() {

	// Allocate memory for large in and out arrays
	int16_t*	in;
	int16_t*	out;
	in = (int16_t*) calloc(SAMPLES, sizeof(int16_t));
	out = (int16_t*) calloc(SAMPLES, sizeof(int16_t));

	int		x;
	int		ttl = 0;

	// Seed the pseudo-random number generator
	srand(-1);

	// Fill the array with random data
	for (x = 0; x < SAMPLES; x++) {
		in[x] = (rand()%65536)-32768;
	}

	// ######################################
	// This is the interesting part!
	// Scale the volume of all of the samples
	for (x = 0; x < SAMPLES; x++) {
		out[x] = scale_sample(in[x], 0.75);
	}
	// ######################################

	// Sum up the data
	for (x = 0; x < SAMPLES; x++) {
		ttl = (ttl+out[x])%1000;
	}

	// Print the sum
	printf("Result: %d\n", ttl);

	return 0;

}
```

This is a simple program that takes sound samples(as `int16_t`) and calculates a new
sample scaled by a volume factor. The higher the volume factor the higher the volume
of the sound output will be. At the end we sum all the samples simply to stop the
compiler from optimizing everything away.

# First approach: Lookup Table

The first optimization we will try is to precompute all the sound samples for a given
volume factor. In our example the `VOLUME_FACTOR` is a constant so we can calculate
all the samples scaled by it beforehand and when we need to scale any given sample
we can just look in our table. This should speed things fairly well if we have a fast
cache.

After doing some modifications to the program we arrive to this code:

```c
#include <stdlib.h>
#include <stdio.h>
#include <stdint.h>
#include "vol.h"

#define VOLUME_FACTOR 0.75f

// Function to scale a sound sample using a volume_factor
// in the range of 0.00 to 1.00.
static inline int16_t scale_sample(int16_t sample, float volume_factor) {
	return (int16_t) (volume_factor * (float) sample);
}
static inline size_t get_index(int16_t sample) {
	return sample + INT16_MAX;
}
static inline int16_t* generate_table(float factor)
{
	int16_t* table = malloc(sizeof(int16_t) * UINT16_MAX);
	for(int16_t current_sample = INT16_MIN;
		current_sample != INT16_MAX; ++current_sample) {
		size_t i = get_index(current_sample);
		table[i] = scale_sample(current_sample, factor);
	}
	table[UINT16_MAX-1] = scale_sample(INT16_MAX, factor);
	return table;
}

int main() {

	// Allocate memory for large in and out arrays
	int16_t*	in;
	int16_t*	out;
	int16_t* table = generate_table(VOLUME_FACTOR); // Compute table
	in = (int16_t*) calloc(SAMPLES, sizeof(int16_t));
	out = (int16_t*) calloc(SAMPLES, sizeof(int16_t));

	int		x;
	int		ttl = 0;

	// Seed the pseudo-random number generator
	srand(-1);

	// Fill the array with random data
	for (x = 0; x < SAMPLES; x++) {
		in[x] = (rand()%65536)-32768;
	}

	// ######################################
	// This is the interesting part!
	// Scale the volume of all of the samples
	for (x = 0; x < SAMPLES; x++) {
		out[x] = table[get_index(in[x])]; // This is now a simple lookup!
	}
	// ######################################

	// Sum up the data
	for (x = 0; x < SAMPLES; x++) {
		ttl = (ttl+out[x])%1000;
	}

	// Print the sum
	printf("Result: %d\n", ttl);

	return 0;

}
```

You can see that I have replaced the `scale_sample()` function call with an array access
which contains our precalculated values.

# Second approach: Inline Assembler

The second optimization it's going to be modifying the function and use inline assembler
to access architecture-specific instructions from the CPU. In this case we will be running
the program in a aarm64 cpu so our inline assembler will correspond to that architecture.

We will use the SIMD instruction `SQDMULH` which allows us to process eight samples at a
time:

```c
// vol_simd.c :: volume scaling in C using AArch64 SIMD
// Chris Tyler 2017.11.29-2018.02.20

#include <stdlib.h>
#include <stdio.h>
#include <stdint.h>
#include "vol.h"

int main() {

	int16_t*		in;		// input array
	int16_t*		limit;		// end of input array
	int16_t*		out;		// output array

	// these variables will be used in our assembler code, so we're going
	// to hand-allocate which register they are placed in
	// Q: what is an alternate approach?
	register int16_t*	in_cursor 	asm("r20");	// input cursor
	register int16_t*	out_cursor	asm("r21");	// output cursor
	register int16_t	vol_int		asm("r22");	// volume as int16_t

	int			x;		// array interator
	int			ttl;		// array total

	in=(int16_t*) calloc(SAMPLES, sizeof(int16_t));
	out=(int16_t*) calloc(SAMPLES, sizeof(int16_t));

	srand(-1);
	printf("Generating sample data.\n");
	for (x = 0; x < SAMPLES; x++) {
		in[x] = (rand()%65536)-32768;
	}

// --------------------------------------------------------------------

	in_cursor = in;
	out_cursor = out;
	limit = in + SAMPLES ;

	// set vol_int to fixed-point representation of 0.75
	// Q: should we use 32767 or 32768 in next line? why?
	vol_int = (int16_t) (0.75 * 32767.0);

	printf("Scaling samples.\n");

	// Q: what does it mean to "duplicate" values in the next line?
	__asm__ ("dup v1.8h,%w0"::"r"(vol_int)); // duplicate vol_int into v1.8h

	while ( in_cursor < limit ) {
		__asm__ (
			"ldr q0, [%[in]],#16		\n\t"
			// load eight samples into q0 (v0.8h)
			// from in_cursor, and post-increment
			// in_cursor by 16 bytes

			"sqdmulh v0.8h, v0.8h, v1.8h	\n\t"
			// multiply each lane in v0 by v1*2
			// saturate results
			// store upper 16 bits of results into v0
			
			"str q0, [%[out]],#16		\n\t"
			// store eight samples to out_cursor
			// post-increment out_cursor by 16 bytes

			// Q: what happens if we remove the following
			// two lines? Why?
			: [in]"+r"(in_cursor)
			: "0"(in_cursor),[out]"r"(out_cursor)
			);
	}

// --------------------------------------------------------------------

	printf("Summing samples.\n");
	for (x = 0; x < SAMPLES; x++) {
		ttl=(ttl+out[x])%1000;
	}

	// Q: are the results usable? are they correct?
	printf("Result: %d\n", ttl);

	return 0;

}
```

We can see that in this example we use some in line assembly to hand-allocate the
registers for our variables. This can potentially make our program faster, if somehow
we are able to be better than the compiler's register allocator. In general we tend to
not be better than the compiler at allocating registers so another option here would
be to uses placeholders in our inline assembler template(`%1`, `%2`). This would allow
the compiler to optimize the register allocation however it please and it would place
the correct registers in our template for us.

On line 42 we transform the volume factor `0.75` to a fixed-point representation by
multiplying by `32767.0` which is the value of `INT16_MAX`. This operation returns the
value of `0.75` in a `int16_t` size. Fixed-point math should give us a slight performance
boost and allows us to use `SQDMULH`!

In our assembly we will load the sound samples in the SIMD register `v0` and we will load
the volume factor in `v1`. On line 47 we are 'duplicating' the value of the volume factor
in all the eight lanes of `v1` divided in 16 bit lanes. Now in the loop we can multiply
eight sound samples with the values loaded in `v1`.

Because our inline assembler needs to interact with variables of our C code we use a couple
placeholders(`%[in]`, `%[out]`). The value of these placeholders is given at the end of the
template in lines 67 and 68. We need this part or otherwise our assembler would not play
nice with the surrounding C code.

# The benchmark

To compare the performance of the different version of this program I have written a simple
that uses the gnu `time` command to time the execution of the script. Each program will be
run a number of times and I'll plot the numbers on a graph to visualize it better.

These are the results on an arm64 server:

|Optimization Applied|Accumulated|Average|Minimum|Maximum|
|Unoptimized|25.640|2.564|2.510|2.610|
|Fixed-point|25.440|2.544|2.460|2.630|
|Inline ASM|25.370|2.537|2.460|2.610|
|Lookup Table|26.460|2.664|2.550|2.780|
|C++ Version|26.670|2.667|2.560|2.780|


And here we have the results taken from my laptop(i7-7200U) for comparison:

|Optimization Applied|Accumulated|Average|Minimum|Maximum|
|Unoptimized|5.550|0.555|0.550|0.570|
|Lookup Table|6.050|0.605|0.570|0.640|
|C++ Version|5.950|0.595|0.580|0.610|

The inline assembler version has been skipped as the code is non-portable.

Aside from the versions shown above I included a C++ rewrite as I wanted to see if generating
the lookup table at compile time(via `constexpr`) could speed things up further(it did not).

Okay so I both table I have put the minimum, maximum and average run times for different versions
of the program with optimizations applied. We can that on ARM64 the inline assembly gave us the
edge and gave us the lowest times across all versions. The fixed-point optimization also gave us
a slight performance boost but the lookup table(both generated at runtime and at compile-time) did
not give us a noticeable performance boost. Somehow the compile-time generated lookup table is shown
to be slower than the runtime version.

On x86 we see that the unoptimized version of the code is actually the fastest. The reason for this:
the vectorizer is kicking in and converting our code to a vectorized version. We can appreciate this
in a short snippet of the disassembler:

```asm
  400550:       f3 41 0f 6f 4c 05 00    movdqu 0x0(%r13,%rax,1),%xmm1
  400557:       66 0f 6f d4             movdqa %xmm4,%xmm2
  40055b:       66 0f 65 d1             pcmpgtw %xmm1,%xmm2
  40055f:       66 0f 6f c1             movdqa %xmm1,%xmm0
  400563:       66 0f 61 c2             punpcklwd %xmm2,%xmm0
  400567:       66 0f 69 ca             punpckhwd %xmm2,%xmm1
  40056b:       0f 5b c0                cvtdq2ps %xmm0,%xmm0
  40056e:       0f 5b c9                cvtdq2ps %xmm1,%xmm1
  400571:       0f 59 c3                mulps  %xmm3,%xmm0
  400574:       0f 59 cb                mulps  %xmm3,%xmm1
```

The `xmm` registers are somewhat equivalent to the `v` registers from our aarch64 example.
Because this implementation is already using vectorized code the optimizations we applied
actually made the code slower.




