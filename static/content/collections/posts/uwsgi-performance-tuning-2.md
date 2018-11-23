---
title: 我如何对 uWSGI 进行性能调优（2）：设定 worker 数量
created_at: 2018-11-23T14:43:21.767Z
tags:
  - uWSGI
  - web
  - Python
authors: Frederic Chan
categories: Python
meta:
  keywords: uWSGI Python web
isPage: false
isFeatured: false
hero:
  image: /images/uploads/marko-blazevic-219788-unsplash.jpg
excerpt: >-
  在上一篇文章中，我们谈到了 uWSGI worker
  的数量需要根据配置进行测试、精细调整，而不能拍脑门定一个数字。在这篇文章中，我会结合自己尝试的经历解释其中的原因。
---
最近看了一篇文章（<https://blog.codeship.com/getting-every-microsecond-out-of-uwsgi/>），看完之后随手测试了一下每课服务器端的性能。不测不知道，一测吓一跳，课表查询的 QPS 只有 30/s 左右。虽然似乎并不太影响用户的实际使用，但是这个性能显然有点太惨了，于是开始尝试对性能进行 tuning。

因为每课的业务逻辑是大一刚入学的时候写的，那时候知识量比较有限，所以基本是一个“又不是不能用”的情况，性能不会特别好。考虑到我们已经重新设计了一套新的数据库结构、并且课表查询相关的业务逻辑即将迁移到专门的微服务内进行，这个时候再花时间去改老的业务逻辑不是特别必要，因此**本次优化的基本思路是：先优化 uWSGI 相关的，再优化（实在看不过去的）业务逻辑。**

在明确了这个目标之后，考虑到健康检查页面（/_healthCheck）是一个没有数据库查询、甚至没有
