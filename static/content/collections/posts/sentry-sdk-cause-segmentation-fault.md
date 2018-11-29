---
title: Sentry SDK 导致 Python 出现段异常
created_at: 2018-11-29T14:43:21.767Z
tags:
  - Python
  - Sentry
  - Alpine
  - Linux
authors: Frederic Chan
categories: Python
meta:
  keywords: Python memory Sentry Alpine Linux
isPage: false
isFeatured: false
hero:
  image: /images/uploads/python_coroutine_2.png
excerpt: >-
  最近在每课服务器端内存优化的时候更改了 fork() 函数执行的位置，然而修改之后却导致程序在运行时出现段异常。对于 Python
  开发者来说，段异常这类底层的异常并不多见，因此调试过程也值得记录一下。
---
对于 Python 开发者来说，段异常是个很陌生的东西，平常基本不太遇到。最近在给程序调优的时候出现了段异常，导致程序被系统终止然后被 master respawn，然而 respawn 之后很快再次出现问题，一直这样循环。通过 Google 我们可以知道，是内存访问相关的问题。

{"widget":"qards-section-heading","config":"eyJ0eXBlIjoicHJpbWFyeSIsInRpdGxlIjoiRmluZGluZyB0aGUgY3VscHJpdCIsInN1YnRpdGxlIjoiZmF1bHRoYW5kbGVyIGlzIHlvdXIgZnJpZW5kIn0="}

由于解释器被操作系统终止，因此自然也没有 traceback 输出，因此我们无法从日志中发现问题的起源。幸运的是，Python 3.3 之后我们有了 faulthandler 模块，它可以打印出 trackback 信息。只需要将以下两行代码加入程序中：

{"widget":"qards-code","config":"eyJjb2RlIjoiaW1wb3J0IGZhdWx0aGFuZGxlclxuZmF1bHRoYW5kbGVyLmVuYWJsZSgpIiwibGFuZ3VhZ2UiOiJweXRob24ifQ=="}

于是程序输出了如下信息：

{"widget":"qards-code","config":"eyJjb2RlIjoiRmF0YWwgUHl0aG9uIGVycm9yOiBTZWdtZW50YXRpb24gZmF1bHRcbkN1cnJlbnQgdGhyZWFkIDB4MDAwMDdmZjBmNWNjMWFlOCAobW9zdCByZWNlbnQgY2FsbCBmaXJzdCk6XG5GaWxlIFwiL3Vzci9sb2NhbC9saWIvcHl0aG9uMy43L3NzbC5weVwiLCBsaW5lIDM4OCBpbiBfX25ld19fXG5GaWxlIFwiL3Vzci9sb2NhbC9saWIvcHl0aG9uMy43L3NzbC5weVwiLCBsaW5lIDEyMTEgaW4gd3JhcF9zb2NrZXRcbkZpbGUgXCIvdmFyL2V2ZXJ5Y2xhc3Mtc2VydmVyLy52ZW52L2xpYi9weXRob24zLjcvc2l0ZS1wYWNrYWdlcy9yYXZlbi91dGlscy9odHRwLnB5XCIsIGxpbmUgMzggaW4gY29ubmVjdFxuRmlsZSBcIi91c3IvbG9jYWwvbGliL3B5dGhvbjMuNy9odHRwL2NsaWVudC5weVwiLCBsaW5lIDk1NiBpbiBzZW5kXG5GaWxlIFwiL3Vzci9sb2NhbC9saWIvcHl0aG9uMy43L2h0dHAvY2xpZW50LnB5XCIsIGxpbmUgMTAxNiBpbiBfc2VuZF9vdXRwdXRcbkZpbGUgXCIvdXNyL2xvY2FsL2xpYi9weXRob24zLjcvaHR0cC9jbGllbnQucHlcIiwgbGluZSAxMjI0IGluIGVuZGhlYWRlcnNcbkZpbGUgXCIvdXNyL2xvY2FsL2xpYi9weXRob24zLjcvaHR0cC9jbGllbnQucHlcIiwgbGluZSAxMjc1IGluIF9zZW5kX3JlcXVlc3RcbkZpbGUgXCIvdXNyL2xvY2FsL2xpYi9weXRob24zLjcvaHR0cC9jbGllbnQucHlcIiwgbGluZSAxMjI5IGluIHJlcXVlc3RcbkZpbGUgXCIvdXNyL2xvY2FsL2xpYi9weXRob24zLjcvdXJsbGliL3JlcXVlc3QucHlcIiwgbGluZSAxMzE3IGluIGRvX29wZW5cbkZpbGUgXCIvdmFyL2V2ZXJ5Y2xhc3Mtc2VydmVyLy52ZW52L2xpYi9weXRob24zLjcvc2l0ZS1wYWNrYWdlcy9yYXZlbi91dGlscy9odHRwLnB5XCIsIGxpbmUgNDYgaW4gaHR0cHNfb3BlblxuRmlsZSBcIi91c3IvbG9jYWwvbGliL3B5dGhvbjMuNy91cmxsaWIvcmVxdWVzdC5weVwiLCBsaW5lIDUwMyBpbiBfY2FsbF9jaGFpblxuRmlsZSBcIi91c3IvbG9jYWwvbGliL3B5dGhvbjMuNy91cmxsaWIvcmVxdWVzdC5weVwiLCBsaW5lIDU0MyBpbiBfb3BlblxuRmlsZSBcIi91c3IvbG9jYWwvbGliL3B5dGhvbjMuNy91cmxsaWIvcmVxdWVzdC5weVwiLCBsaW5lIDUyNSBpbiBvcGVuXG5GaWxlIFwiL3Zhci9ldmVyeWNsYXNzLXNlcnZlci8udmVudi9saWIvcHl0aG9uMy43L3NpdGUtcGFja2FnZXMvcmF2ZW4vdXRpbHMvaHR0cC5weVwiLCBsaW5lIDY2IGluIHVybG9wZW5cbkZpbGUgXCIvdmFyL2V2ZXJ5Y2xhc3Mtc2VydmVyLy52ZW52L2xpYi9weXRob24zLjcvc2l0ZS1wYWNrYWdlcy9yYXZlbi90cmFuc3BvcnQvaHR0cC5weVwiLCBsaW5lIDQzIGluIHNlbmRcbkZpbGUgXCIvdmFyL2V2ZXJ5Y2xhc3Mtc2VydmVyLy52ZW52L2xpYi9weXRob24zLjcvc2l0ZS1wYWNrYWdlcy9yYXZlbi90cmFuc3BvcnQvdGhyZWFkZWQucHlcIiwgbGluZSAxNjUgaW4gc2VuZF9zeW5jXG5GaWxlIFwiL3Zhci9ldmVyeWNsYXNzLXNlcnZlci8udmVudi9saWIvcHl0aG9uMy43L3NpdGUtcGFja2FnZXMvcmF2ZW4vdHJhbnNwb3J0L3RocmVhZGVkLnB5XCIsIGxpbmUgMTQ1IGluIF90YXJnZXRcbkZpbGUgXCIvdXNyL2xvY2FsL2xpYi9weXRob24zLjcvdGhyZWFkaW5nLnB5XCIsIGxpbmUgODY1IGluIHJ1blxuRmlsZSBcIi91c3IvbG9jYWwvbGliL3B5dGhvbjMuNy90aHJlYWRpbmcucHlcIiwgbGluZSA5MTcgaW4gX2Jvb3RzdHJhcF9pbm5lclxuRmlsZSBcIi91c3IvbG9jYWwvbGliL3B5dGhvbjMuNy90aHJlYWRpbmcucHlcIiwgbGluZSA4ODUgaW4gX2Jvb3RzdHJhcCJ9"}

于是我们发现问题是有 Sentry 的 Python SDK（raven）引起的。考虑到 Python-only 的 SDK 不太可能触发段异常（除非触发解释器 bug），猜测系统的锅比较大。

有没有人有类似的问题呢？Google 了一下之后发现确实有人发生过类似的问题：https://github.com/getsentry/raven-python/issues/1003。底下的回复提到的原因是 Alpine Linux （我使用的 Docker 基础镜像）使用的 C 语言库 `musl` 和一般的 `glibc` 在栈的大小上存在差异。由于 Alpine 一般运行在计算能力比较弱的设备上（你从它只有几 MB 的体积就能看出来），因此在内存的分配上比较节省，而 Python 对操作系统环境的估计比较乐观，因此就出现了异常。

事实上，Python 的官方 Docker 镜像中确实提到了关于 Alpine 采用 musl 所可能导致的问题：

> The main caveat to note is that it does use musl libc instead of glibc and friends, so certain software might run into issues depending on the depth of their libc requirements. However, most software doesn't have an issue with this, so this variant is usually a very safe choice. See this Hacker News comment thread (https://news.ycombinator.com/item?id=10782897) for more discussion of the issues that might arise and some pro/con comparisons of using Alpine-based images.

至于 workaround，网友大致提供了几种：

* 修改 musl，调大 stack size。这种方式感觉过于麻烦了，我不准备采用
* 在 Python 代码中加入 `import threading; threading.stack_size(2*1024*1024)` （出处：https://github.com/docker-library/python/issues/211#issuecomment-338513417 ）

由于第一种方案显得过于 hack，因此我选择了第二种方案，遗憾的是，我没有成功。而且官方表示 Alpine & Python 段异常的问题已经解决了（ https://github.com/docker-library/python/issues/211#issuecomment-353010939 ），所以我打算换一个基镜像来尝试一下是否是 Alpine 的问题。

{"widget":"qards-section-heading","config":"eyJ0aXRsZSI6IlN3aWNoaW5nIGJhc2UgaW1hZ2UiLCJ0eXBlIjoicHJpbWFyeSIsInN1YnRpdGxlIjoiQW5kIHNlZSBpZiB3ZSBjYW4gZ2V0IGx1Y2sifQ=="}

在 Python 官方 Docker Hub 页面中，有两种 Linux 基镜像可选，一种基于 Alpine，一种基于 Debian。 使用 Alpine 很好理解，因为它足够轻量，适宜运行在容器中，在 Docker 社区中非常流行。而另一种使用 Debian 就有一点难以理解了。我试图寻找官方选择 Debian 而不是其他 Linux 发行版的理由，但发现目前没有相关的讨论。Anyway, we'll give Debian a shot.

把基镜像改为 Debian 并不是十分困难，基本上就是把 `apk add` 命令替换成 `apt-get install` 命令，然后替换个别包名。值得一提的是，我使用的基镜像是 `python:3.7.1-slim-stretch`，大小为 143MB，而我的应用镜像最终大小为 454MB。作为对比，原先使用 Alpine 时，最终镜像大小仅为 100MB 左右。

值得欣喜的是，在把基镜像从 Alpine 换到 Debian (Stretch Slim) 之后，确实没有再报段异常了。虽然镜像的体积增大了数倍，但 C 语言库引起的兼容性问题终于解决了。

{"widget":"qards-section-heading","config":"eyJ0eXBlIjoicHJpbWFyeSIsInRpdGxlIjoiQ29uY2x1c2lvbiJ9"}

通过将基镜像从 Alpine 切换到 Debian，我们成功解决了 `musl` 带来的兼容性问题。更重要的是，兼容性并不是切换到 Debian 带来的唯一福利.事实上，你的程序还可能出现一定幅度的性能提升（参见 [Benchmarking Debian vs Alpine as a Base Docker Image](https://nickjanetakis.com/blog/benchmarking-debian-vs-alpine-as-a-base-docker-image)）。

当然，如果执意使用 Alpine，或许也能解决问题。但是考虑到时间效率的平衡，以及未来可能继续出现的兼容性问题，我还是决定不折腾 Alpine 了。看来，一味追求镜像的体积小是会有风险的，尤其是你不可能对整个程序的所有代码面面俱到地掌握（这对于 Python 程序员来说不太可能）的情况下。
