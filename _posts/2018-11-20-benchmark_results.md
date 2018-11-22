---
title: "SPO600 Stage 2: The Results"
layout: post
tags: ['c++', 'stage2', 'libc++', 'bash']
author: Alex
---

My benchmark results are due tomorrow so there is no time like
today to share my results with you. In previous blog posts I have
explained what my environment looks like and what kind of benchmark
I am running(see [the environment]({% post_url 2018-11-18-spo600_stage_2:_environment_setup %})
and [the benchmark]({% post_url 2018-11-19-spo600_stage_2:_benchmarks %}) so in this post
I will focus on results only.

# Results: x86\_64

## Password Validation Test

I ran the password validation test using five different regexes as input.
Each input was tested five times to eliminate caching effects. We'll take 
a look at the top 10 hottest functions.

This is what `perf report` tells us:

```bash
Regex: 'passwd-^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$'

+   25.70%     0.00%  bench    [unknown]          [.] 0x0000000000a3fe20
+   23.82%     0.00%  bench    [unknown]          [.] 0x0000000000000021
+   11.05%     8.52%  bench    bench              [.] std::__1::basic_regex<char, std::__1::regex_traits<char> >::__match_at_start_ecma<std::__1::allocator<std::__1
+    9.96%     3.94%  bench    bench              [.] std::__1::__bracket_expression<char, std::__1::regex_traits<char> >::__exec
+    6.72%     0.00%  bench    [unknown]          [.] 0000000000000000
+    6.66%     0.00%  bench    [unknown]          [.] 0x0000000000000001
+    5.84%     5.82%  bench    libc-2.28.so       [.] _int_free
+    5.68%     1.24%  bench    bench              [.] std::__1::getline<char, std::__1::char_traits<char>, std::__1::allocator<char> >
+    5.68%     2.66%  bench    bench              [.] std::__1::__vector_base<std::__1::pair<unsigned long, char const*>, std::__1::allocator<std::__1::pair<unsigne
+    5.46%     5.44%  bench    bench              [.] std::__1::__state<char>::__state
```

As we can see most of the runtime is spent in the body of the program.
I'm not quite sure why perf is not displaying the symbols but it could
be because of inlining.

These results have been consistent across runs which is good.
A particular function that catches my eye is the `std::__1::__bracket_expression<char, std::__1::regex_traits<char>>::__exec`.
This function corresponds to roughly ~8% of CPU time and makes it a good candidate
for optimization(in other samples it varies between ~3% and ~8%).

Let's see how it compares to another input:

```bash
Regex: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'

+   30.22%     0.00%  bench    [unknown]          [.] 0x00000000016f72b0                                                                                           ◆
+   16.57%     0.00%  bench    [unknown]          [.] 0x0000000000000021                                                                                           ▒
+   11.31%     3.14%  bench    bench              [.] std::__1::__bracket_expression<char, std::__1::regex_traits<char> >::__exec                                  ▒
+   10.65%     8.05%  bench    bench              [.] std::__1::basic_regex<char, std::__1::regex_traits<char> >::__match_at_start_ecma<std::__1::allocator<std::__▒
+    8.30%     0.00%  bench    [unknown]          [k] 0000000000000000                                                                                             ▒
+    7.04%     4.79%  bench    libc++.so.1.0      [.] std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char> >::__init                ▒
+    6.83%     0.00%  bench    [unknown]          [.] 0x0000000000000001                                                                                           ▒
+    6.14%     6.11%  bench    libc-2.28.so       [.] _int_free                                                                                                    ▒
+    5.73%     2.61%  bench    bench              [.] std::__1::__vector_base<std::__1::pair<unsigned long, char const*>, std::__1::allocator<std::__1::pair<unsign▒
+    5.69%     1.27%  bench    bench              [.] std::__1::getline<char, std::__1::char_traits<char>, std::__1::allocator<char> >
```

Here again see `bracket_expression`. It's also worth noting that this function spends a considerable
amount of time waiting for the allocator in `std::basic_string` and there could be potential for performance
improvement if the number of allocations can be reduced(but maybe it can't, I'll investigate this course of action).

As we can see both samples show similar results even when inputs are different, however in this run `bracket_expression`
is taking more time in the latest sample.

# Results: aarch64

Now we have seen the results on `x86_64` and we have an idea of what functions are hot
in the program. I would expect that the results in `aarch64` would follow what I saw in
`x86_64`.

On my Raspberry Pi the benchmarks took significantly longer to run and because of this
I got almost ten times as much data to analyze.

Because of undetermined reasons the report coming from my raspberry pi is a lot more complete.
I honestly have no clue why. I checked both build and even used the same docker image on both
to equalize environments and I confirmed that I did enable debug symbols in both builds.

```bash
Regex: '^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$'

+  100.00%     0.00%  bench    bench               [.] _start                                                                                                               ◆+  100.00%     0.00%  bench    libc-2.28.so        [.] __libc_start_main                                                                                                    ▒
+   99.75%     0.20%  bench    bench               [.] main                                                                                                                 ▒
+   91.46%     0.37%  bench    bench               [.] std::__1::regex_match<std::__1::__wrap_iter<char const*>, std::__1::allocator<std::__1::sub_match<std::__1::__wrap_it▒
+   90.50%     0.17%  bench    bench               [.] std::__1::basic_regex<char, std::__1::regex_traits<char> >::__search<std::__1::allocator<std::__1::sub_match<char con▒
+   88.09%    10.61%  bench    bench               [.] std::__1::basic_regex<char, std::__1::regex_traits<char> >::__match_at_start_ecma<std::__1::allocator<std::__1::sub_m▒
+   75.11%     0.33%  bench    bench               [.] std::__1::__lookahead<char, std::__1::regex_traits<char> >::__exec                                                   ▒
+   18.03%     1.86%  bench    bench               [.] std::__1::vector<std::__1::__state<char>, std::__1::allocator<std::__1::__state<char> > >::__push_back_slow_path<std:▒
+   15.13%     1.46%  bench    bench               [.] std::__1::__state<char>::__state                                                                                     ▒
+   13.87%     1.26%  bench    libc++.so.1.0       [.] operator delete                                                                                                      ▒
+   13.66%     3.27%  bench    libc++.so.1.0       [.] operator new                                                                                                         ▒
+   13.16%     1.58%  bench    bench               [.] std::__1::vector<std::__1::pair<unsigned long, char const*>, std::__1::allocator<std::__1::pair<unsigned long, char c▒
+   12.19%     1.73%  bench    bench               [.] std::__1::__state<char>::~__state                                                                                    ▒
+   12.14%     4.94%  bench    bench               [.] std::__1::__bracket_expression<char, std::__1::regex_traits<char> >::__exec                                          ▒
```

This more complete outlook shows a lot more function calls. We see `bracket_expression` at the end of the report.
Please note that it also corresponds to around ~12% of the runtime which is more or less in line with the result
observed in `x86_64`.

## Email Validation Test

The other benchmark that I devised is a simple email detection/validation check.
These are the results:

## x86\_64


```bash
+   57.18%     0.00%  bench    [unknown]          [.] 0x0000000000891ba0                                                                                                    
+   15.60%    14.17%  bench    bench              [.] std::__1::basic_regex<char, std::__1::regex_traits<char> >::__match_at_start_ecma<std::__1::allocator<std::__1::sub_ma
+   12.87%     0.00%  bench    [unknown]          [.] 0x0000000000892cf0                                                                                                    
+    8.45%     3.53%  bench    bench              [.] std::__1::__vector_base<std::__1::pair<unsigned long, char const*>, std::__1::allocator<std::__1::pair<unsigned long,
+    6.94%     6.59%  bench    bench              [.] std::__1::__bracket_expression<char, std::__1::regex_traits<char> >::__exec                                         
+    6.29%     1.99%  bench    bench              [.] std::__1::vector<std::__1::pair<unsigned long, char const*>, std::__1::allocator<std::__1::pair<unsigned long, char co
+    6.22%     6.18%  bench    libc-2.28.so       [.] _int_free
```
Here we can see `__bracket_expression::__exec` taking roughly 6% of the run time. The results are consistent across runs.

## aarch64

```bash
+   14.83%     1.74%  bench    bench              [.] std::__1::vector<std::__1::pair<unsigned long, char const*>, std::__1::allocator<std::__1::pair<unsigned long, char co▒
+   14.59%     2.20%  bench    bench              [.] std::__1::__vector_base<std::__1::pair<unsigned long, char const*>, std::__1::allocator<std::__1::pair<unsigned long, ▒
+   12.96%     0.99%  bench    libc++.so.1.0      [.] operator delete                                                                                                       ▒
+   12.85%     3.12%  bench    libc++.so.1.0      [.] operator new                                                                                                          ▒
+   11.05%     6.40%  bench    libc-2.28.so       [.] malloc                                                                                                                ▒
+   10.09%     8.71%  bench    libc-2.28.so       [.] _int_free                                                                                                             ▒
+    8.51%     8.25%  bench    bench              [.] std::__1::__bracket_expression<char, std::__1::regex_traits<char> >::__exec
```
This report has been edited for brevity, there were more symbols above these ones.

Again I can see that `bracket_expression::__exec` is taking 8% of the runtime. Slightly higher than `x86_64` which hopefully means there is room for improvement there.


# Conclusions

From these benchmarks I have identified some possible points where optimization could be applied.
I will further investigate those hot-spots and find out if there's any way of making them better.

I have put the benchmarks on my [GitHub](https://github.com/e4lejandr0/libcxx-benchmarks) and it also contains the Dockerfile in case you would like
reproduce my tests(requires a Fedora 29 kernel because of perf).

