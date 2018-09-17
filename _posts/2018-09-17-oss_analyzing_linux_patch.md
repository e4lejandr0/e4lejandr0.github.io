---
layout: post
title: "Analyzing a Linux Patch"
author: Alex
tags: ['linux', 'patch', 'foss']
---
As part of my SPO600 assignment I was tasked to take a look at a successful patch applied
to a project of my choice. I chose Linux and in the previous blog post I discussed the community
around Linux and gave an overview of the process that one has to go through if one wants
to become an official contributor.

In this blog post I will actually grab a patch and we'll go through with it to see what it
looks like once you have gone through the process.

## The Kernel

For this blog post I will obtain a new copy of the Linux source tree
(available [here](https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git)). We
will take a look at a patch applied against the latest release candidate of the kernel. The
version number is `4.19-rc4`.

## The Patch

We will be reviewing a minor patch applied against the ext4 filesystem. Here we have the commit message
as extracted for the Linux git repository:

```
commit 338affb548c243d2af25b1ca628e67819350de6b (HEAD)
Author: Eric Biggers <ebiggers@google.com>
Date:   Sat Sep 15 14:28:26 2018 -0400

    ext4: show test_dummy_encryption mount option in /proc/mounts

    When in effect, add "test_dummy_encryption" to _ext4_show_options() so
    that it is shown in /proc/mounts and other relevant procfs files.

    Signed-off-by: Eric Biggers <ebiggers@google.com>
    Signed-off-by: Theodore Ts'o <tytso@mit.edu>
    Cc: stable@vger.kernel.org
```

And the accompanying diff for this path:

```c
diff --git a/fs/ext4/super.c b/fs/ext4/super.c
index e41da553b430..a430fb3e9720 100644
--- a/fs/ext4/super.c
+++ b/fs/ext4/super.c
@@ -2145,6 +2145,8 @@ static int _ext4_show_options(struct seq_file *seq, struct super_block *sb,
                SEQ_OPTS_PRINT("max_dir_size_kb=%u", sbi->s_max_dir_size_kb);
        if (test_opt(sb, DATA_ERR_ABORT))
                SEQ_OPTS_PUTS("data_err=abort");
+       if (DUMMY_ENCRYPTION_ENABLED(sbi))
+               SEQ_OPTS_PUTS("test_dummy_encryption");

        ext4_show_quota_options(seq, sb);
        return 0;
```

From our first look to this patch we can see that it is a very minor change. A couple lines were
added to a file. This illustrates the point that no change is too small to make it onto the kernel.
Contributions do not have to be big they just need to be useful and improve the quality of the code
in a measurable way.

### The Commit Message

Let's take a detailed look at the commit message of this patch:

```
    ext4: show test_dummy_encryption mount option in /proc/mounts

    When in effect, add "test_dummy_encryption" to _ext4_show_options() so
    that it is shown in /proc/mounts and other relevant procfs files.

    Signed-off-by: Eric Biggers <ebiggers@google.com>
    Signed-off-by: Theodore Ts'o <tytso@mit.edu>
    Cc: stable@vger.kernel.org
```

The first line is the header. This line appears when issuing a `git log --oneline` or when looking
at `git shortlog` and because of this it is very important that the first line of the commit message 
follows the standard format of the Linux Kernel.

The header must include the subsystem that is affected by the change in the patch and a one-line 
description of what the change is. In this case we can see that the patch affects the `ext4` subsystem
and it "show test_dummy_encryption mount option in /proc/mounts". 

All the commits in the kernel(or well, most of them) use this format and it allows for kernel developers
to quickly asses whether a patch is of interest for them.

If we keep looking down we will find the actual commit message. There is a separation between the header line
and the commit message and this is important for tools that analyze and aggregate commit messages.

In the body of the message we have a more detailed description of what the changes are, why the change is needed
and what it affects. The message doesn't have a length requirement but the kernel developers will expect you
to explain clearly and concisely why your patch should be taken.

Finally at the end of the commit message we can see some lines starting with "signed-off". In order for a commit
to be merged into the kernel the commit must be "signed-off" by the author. This leaves a record that someone
looked at the patch and agreed with it being merged. All commits start being "signed-off" by the author,
additionally during the review process other kernel developers can sign-off a patch to express approval.

Kernel developers can also sign a commit with an "Acked-By" tag that expresses that the patch has been acknowledged
but the developer doesn't necessarily endorse or approve the patch.

All the possible tags and commit signing are documented in the official documentation as usual.

### The Code

The kernel also has standards for the code itself when a patch is getting merged. In this case I have picked
a very small patch for simplicity so there is not much that could go wrong with it. However in a longer patch
we would have to be very careful to make sure that the code matches the standards.

As part of the kernel source we can find tools created by the kernel developers to help in the code review
process. One very handy tool when creating patches is the `checkpatch.pl` script found in `scripts/checkpatch.pl`.
This nifty Perl script will analyze the files and commit messages of a patch and make sure that there are no obvious
blockers for your patch.

A good way for new developers to contribute to Linux is by finding checkpatch warnings and fixing them when appropriate.


And that is it, we have seen what a successful patch to the Linux kernel looks like.
