---
title: "Looking Into libc++'s regex engine"
layout: post
tags: ['c++', 'libcxx', 'libc++', 'regex']
author: Alex
---
Today I would like to take a deeper look at the source code of `<regex>`.
I have been analyzing libc++ throughout this semester but only recently I have
been actually looking at the source code and I have found it to be a learning experience :).

Currently I am looking at some very specific functions within `<regex>` namely `__bracket_expression::__exec`
and `regex_traits::__match_at_start_ecma` which showed up on the measurements that I took during the bench-marking
phase of this project.

# Understanding `__bracket_expression`

First let's take a look at the declaration of the `__bracket_expression` type:

```cpp
template <class _CharT, class _Traits>
class __bracket_expression
    : public __owns_one_state<_CharT>
{
    typedef __owns_one_state<_CharT> base;
    typedef typename _Traits::string_type string_type;

    _Traits __traits_;
    vector<_CharT> __chars_;
    vector<_CharT> __neg_chars_;
    vector<pair<string_type, string_type> > __ranges_;
    vector<pair<_CharT, _CharT> > __digraphs_;
    vector<string_type> __equivalences_;
    typename regex_traits<_CharT>::char_class_type __mask_;
    typename regex_traits<_CharT>::char_class_type __neg_mask_;
    bool __negate_;
    bool __icase_;
    bool __collate_;
    bool __might_have_digraph_;

    __bracket_expression(const __bracket_expression&);
    __bracket_expression& operator=(const __bracket_expression&);
public:
    typedef _VSTD::__state<_CharT> __state;

    _LIBCPP_INLINE_VISIBILITY
    __bracket_expression(const _Traits& __traits, __node<_CharT>* __s,
                                 bool __negate, bool __icase, bool __collate)
        : base(__s), __traits_(__traits), __mask_(), __neg_mask_(),
          __negate_(__negate), __icase_(__icase), __collate_(__collate),
          __might_have_digraph_(__traits_.getloc().name() != "C") {}

    virtual void __exec(__state&) const; // This is the most important function of this class!

    _LIBCPP_INLINE_VISIBILITY
    bool __negated() const {return __negate_;}

    _LIBCPP_INLINE_VISIBILITY
    void __add_char(_CharT __c);

    _LIBCPP_INLINE_VISIBILITY
    void __add_neg_char(_CharT __c);

    _LIBCPP_INLINE_VISIBILITY
    void __add_range(string_type __b, string_type __e);

    _LIBCPP_INLINE_VISIBILITY
    void __add_digraph(_CharT __c1, _CharT __c2);

    _LIBCPP_INLINE_VISIBILITY
    void __add_equivalence(const string_type& __s);

    _LIBCPP_INLINE_VISIBILITY
    void __add_class(typename regex_traits<_CharT>::char_class_type __mask);

    _LIBCPP_INLINE_VISIBILITY
    void __add_neg_class(typename regex_traits<_CharT>::char_class_type __mask);

};
```

This is a relatively simple class, it models a small finite state machine whose job is to match
bracket expressions(example: `a{0,8}`). The standard library of C++ provides many customization points
and we can see that this class is open to customization through the `_Traits` template parameter that
tells the library how to manipulate the type `_CharT`.

The most important function in this class is `virtual void __exec(__state&) const`. This class is called
each time that we need to transition into a new state, it takes as a parameter the previous state. For
every input state we have a well-defined output state. By calling `__exec` in a loop the finite state machine
will go through an input string and at the end it will either match or reject a string.

# The `__exec(__state&) const` function

After having observed at the declaration of `__bracket_expression` I recognized that the actual meat of this code
must be in the `__exec()` function. This function is a couple pages long and it encodes the rules for matching bracket
expressions. The function iterates through the input string and calculates the new state based on the input state and
the input string.

This function is far too long to copy-paste it here but I will note some points that I observed while going through it:

1. Localization increases complexity
2. Memory allocations via `std::string`
3. Localization creates memory allocations

The second point is easy to see why I found it interesting. Memory allocations are expensive but inside `__exec()` I have
found some memory allocations performed via `std::string`. A couple examples of cases where these allocations occur: 

1. When performing a case insensitive search, the input string will be transformed into lowercase and in the process
a new `std::string` will be created
2. When the user is performing any search, the input string is translated into a lexicographically comparable form
which is copied into a new `std::string` 

If these memory allocations could be mitigated there may be some performance to be gained. So far my benchmarks have shown a
very slight improvement when eliminating some of the memory allocations so I may be onto something here.

The other two points refer to localization and it's also related to the memory allocation issue. Because of localization the
`__exec()` function is very complex and localization also imposes some memory allocations too. To handle locale-specific matches
the input string is always copied into a new lexicographically comparable form. This always incurs in a memory allocation _even
if the current locale would otherwise not need it_(ie ASCII text is by itself lexicographically comparable.

# Optimization opportunity?

My view of the world maybe warped having lived my whole life in Latin-alphabet countries. But I believe that most
of the time when someone is matching a regular expression they are doing so looking among the most common character set:
ASCII. Based on this I have the thought of applying an optimization where when collation is not needed for the input string
I can avoid a bunch of memory allocations by simply returning a `std::string_view` object into the input string.

This should ideally save me some time when allocating that memory and also when deallocating it. Hopefully this is a sound idea.

I have implemented a very ghetto version of this optimization, by aggressively migrating to a `std::string_view` I was able to get
a ~7% improvement (but I also completely broke locale support). A few more conservative approaches have gained me ~1-5% so I am a bit
optimistic.

I hope to run my implementation by the LLVM guys, hopefully I'm onto something here :)

The first point refers to the fact that the regular expression engine found in `<regex>` must be locale-aware as the
standard mandates. Surprisingly most of the complexity in the `__exec()` is there just to be able to handle multiple
locales! 
