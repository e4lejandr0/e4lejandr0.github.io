---
title: "SPO600 Stage 2: The Benchmark"
layout: post
tags: ['c++', 'stage2', 'libc++', 'bash']
author: Alex
---

I have explained what my environment looks like for conducting benchmarks
of `libc++`. I will now explain what the benchmark program looks like and
what the methodology will be for gathering results.

# The Benchmark

I have created a very simple program that emulates `grep`. It takes a regular
expression and a file as arguments and it will count how many lines match the
given regular expression and will print the total at the end:

```bash
$ bench '^[a-zA-Z].*[0-9]$' input/rockyou.txt
Lines matched: 5770951
```
In this run it counts how many lines start with a letter and finish with a digit.
This is the source code of the program:

```cpp 
#include <iostream>
#include <fstream>
#include <regex>
#include <array>

int main(int argc, char** argv) {

        if(argc != 3) {
                std::cerr << "Usage: " << argv[0] << " <regex> <file>\n";
                return 1;
        }

        std::ifstream input(argv[2]);
        std::smatch submatches;
        std::regex test_expr(argv[1]);
        size_t total_matches = 0;

        for(std::string line; std::getline(input, line);) {
                std::regex_match(line, submatches, test_expr);
                total_matches += submatches.size();
        }
        std::cout << "Lines matched: " << total_matches << "\n";

        return 0;
}
```

This is a very naive implementation and it could be optimized to preload the
file in RAM or read in `PAGE_SIZE` chunks instead of line by line.

# The Tests

I will conduct several tests with different regular expressions and data. I will
try to reproduce common use cases for regular expressions such as email validation
and password validation.

## Password Validation Test

```yaml
Regular Expressions:
    - '^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$' 
    - '^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$'
    - '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$'
    - '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'
    - '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,10}$'
Input File: input/rockyou.txt
```

For this test I have gathered some regular expression for common password
requirements. The regular expressions were extracted from this
[StackOverflow post](https://stackoverflow.com/questions/19605150/regex-for-password-must-contain-at-least-eight-characters-at-least-one-number-a).

For the input I will use the infamous rockyou wordlist. This is a password
list that was leaked some time ago. The rockyou wordlist `14344391` actual
real user passwords so it should provide a realistic input for this test.

# Email Detection Test

For the second test I will try some regular expressions meant to validate
or detect valid email address(don't do this in production, it doesn't work).
Here's the regular expressions that will be tried and the input file:

```yaml
Regular Expressions:
    - .*\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}.*
    - .*([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?).*
Input File: input/lkml.html
```

The input given will be a concatenation of the Linux Kernel Mailing List
between November 16th and November 23rd 2019. This data was gathered by
scraping the archive at `http://lkml.iu.edu/hypermail/linux/kernel/`.

The final file contains 19 megabytes worth of emails and html. The regular
expressions will help find how many "valid" email addresses are there in those
files.

# Automated Testing

For the purposes of this project I have created a simple script that runs
the my test program with the provided inputs. It does several runs in order
to warm up the cache and saves the results of the `perf record` into a results
directory.

The source code of my testing script:

```bash
#!/bin/bash

log() {
    printf "[ %s ] %s\n" "$(date +'%Y%m%d:%H%S')" "$*"
}

run-test() {

    # Times to run a single test
    local MaxRuns=5

    # Input Params
    local -n input_files=$2
    local -n test_regexes=$1
    local test_name="$3"

    # Perf config
    local perf_exe=perf
    local perf_flags=('record' '-g')

    local test_command="$PWD/bin/bench"
    local results_dir="results"
    local result_name_fmt="${test_name}-%s-%d.perf"


    for input_file in "${input_files[@]}"; do
        for regex in "${test_regexes[@]}"; do
                perf_cmd="${perf_exe} ${perf_flags[@]} -o '${results_dir}/${result_name_fmt}' '${test_command}' '%s' '%s'"
                for i in $(seq 1 $MaxRuns); do
                        # printf "${perf_exe} ${perf_flags[1]} -o '${results_dir}/${test_name}-%s-${i}.perf' '%s' %s\n" "${regex}" "${regex}" "${input_file}"
                        printf "${perf_cmd}\n" "${regex}" "${i}" "${regex}" "${input_file}"
                done
        done
    done | tee commands.log | parallel
}

run-passwd-test() {

    input=('input/rockyou.txt')
    regexes=('^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$'
         '^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$'
         '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$'
         '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'
         '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,10}$')
    if [ ! -f "${input[0]}"  ]; then
        xzcat < input/rockyou.txt.xz > input/rockyou.txt
    fi

    run-test regexes input 'passwd'
}

run-email-test() {
    input=('input/lkml.html')
    regexes=('.*\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}.*'
         '.*([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?).*')

    if [ ! -f "${input[0]}" ]; then
        xzcat input/lkml.html.xz > input/lkml.html
    fi

    run-test regexes input 'email'
}

main() {

    log "Starting benchmarking process..."

    log "Running password validation tests"
    run-passwd-test

    log "Running email validation tests"
    run-email-test
}

main "$@" 2>&1 | tee benchmark.log
```

The script makes sure to log the commands run for inspection into `commands.log`
and the whole output of itself to `benchmark.log`. After it runs I can examine
the output with `perf report -i results/$test_results_file`.

This covers the testing environment completely, next time I will share some of
the results of this benchmark.
