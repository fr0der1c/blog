---
title: 我如何对 uWSGI 进行性能调优
created_at: 2018-11-21T14:43:21.767Z
tags:
  - uWSGI
  - web
  - Python
authors: Frederic Chan
categories: Admirable Insight
meta:
  keywords: uWSGI Python web
isPage: false
isFeatured: false
hero:
  image: /images/uploads/marko-blazevic-219788-unsplash.jpg
excerpt: >-
  uWSGI 是 Python Web
  世界里广泛采用的应用服务器。它的配置非常复杂，如果要用于生产环境，有很多东西值得细细了解。本篇文章作为自己进行性能调优的记录。
---
最近看了一篇文章（<https://blog.codeship.com/getting-every-microsecond-out-of-uwsgi/>），看完之后随手测试了一下每课服务器端的性能。不测不知道，一测吓一跳，课表查询的 QPS 只有 30/s 左右。虽然似乎并不太影响用户的实际使用，但是这个性能显然有点太惨了，于是开始尝试对性能进行 tuning。

因为每课的业务逻辑是大一刚入学的时候写的，那时候知识量比较有限，所以基本是一个“又不是不能用”的情况，性能不会特别好。考虑到我们已经重新设计了一套新的数据库结构、并且课表查询相关的业务逻辑即将迁移到专门的微服务内进行，这个时候再花时间去改老的业务逻辑不是特别必要，因此本次优化的基本思路是：先优化 uWSGI 相关的，再优化（实在看不过去的）业务逻辑。

在明确了这个目标之后，考虑到健康检查页面（/_healthCheck）是一个没有数据库查询、甚至没有任何业务逻辑直接返回 JSON 的 endpoint，我选择了它作为优化 uWSGI 时测试的对象。（通常来说，你可能希望在健康检查的 endpoint 中加入检查数据库连接等逻辑，但在目前版本的每课 Server 中，我们仅仅直接返回了一个`{"status": "ok"}` 的 JSON）

> 实际情况比我上面的描述略微复杂一点：我们有个 `before_request` 钩子，在请求开始处理前标识每个独立用户，这个过程会访问数据库获取唯一 ID，但因为我们测试的是数据库无关的性能问题，我临时把这个功能去掉了）

{"widget":"qards-section-heading","config":"eyJ0aXRsZSI6IlByZXBhcmF0aW9ucyBiZWZvcmUgc3RhcnQgdHVuaW5nIiwidHlwZSI6InByaW1hcnkifQ=="}

首先贴一下 tuning 之前的 uwsgi.ini：

{"widget":"qards-code","config":"eyJsYW5ndWFnZSI6ImluaSIsImNvZGUiOiJbdXdzZ2ldXG5jaGRpciA9IC92YXIvZXZlcnljbGFzcy1zZXJ2ZXJcbnZlbnYgPSAudmVudlxucHl0aG9ucGF0aCA9IC92YXIvZXZlcnljbGFzcy1zZXJ2ZXJcblxuIyBsYXVuY2hlclxud3NnaS1maWxlID0gZWNfc2VydmVyLnB5XG5jYWxsYWJsZSA9IGFwcFxuXG4jIHdvcmtlcnNcbm1hc3RlciA9IHRydWVcbnByb2Nlc3NlcyA9IDRcbnRodW5kZXItbG9jayA9IHRydWVcbmxhenktYXBwcyA9IGZhbHNlXG5cbiMgZGVzdHJveSBzdHVja2VkIHByb2Nlc3Nlc1xuaGFyYWtpcmkgPSAzMFxuXG4jIHRocmVhZGluZyBzdXBwb3J0XG5lbmFibGUtdGhyZWFkcyA9IHRydWVcblxucGx1Z2lucyA9IC91c3IvbG9jYWwvbGliL3V3c2dpL3B5dGhvbjM3XG5cbiMgdG91Y2ggdG8gcmVsb2FkXG50b3VjaC1yZWxvYWQgPSAvdmFyL2V2ZXJ5Y2xhc3Mtc2VydmVyL3JlbG9hZFxuXG4jIHByb2Nlc3Mgd2lsbCBiZSByZWN5Y2xlZCBhZnRlciAxMDAwIHJlcXVlc3RzKGNhbiBiZSB1c2VkIHRvIGZpZ2h0IGFnYWluc3QgbWVtb3J5IGxlYWspXG5tYXgtcmVxdWVzdHMgPSAxMDAwXG5cbiMgdXNlIG1lYW5pbmdmdWwgbmFtZVxuYXV0by1wcm9jbmFtZSA9IHRydWVcblxuIyBoYW5kbGUgdVdTR0kgd3JpdGUgZXJyb3Jcbmlnbm9yZS1zaWdwaXBlID0gdHJ1ZVxuaWdub3JlLXdyaXRlLWVycm9ycyA9IHRydWVcbmRpc2FibGUtd3JpdGUtZXhjZXB0aW9uID0gdHJ1ZSJ9"}

我们先用这个配置跑出一个成绩作为后续调优的 baseline：

```bash
$ ab -c 200 -n 3000  http://127.0.0.1:80/
```

结果如下：

{"widget":"qards-code","config":"eyJjb2RlIjoiUmVxdWVzdHMgcGVyIHNlY29uZDogICAgMTEyLjc1IFsjL3NlY10gKG1lYW4pXG5UaW1lIHBlciByZXF1ZXN0OiAgICAgICAxNzczLjgzNSBbbXNdIChtZWFuKVxuVGltZSBwZXIgcmVxdWVzdDogICAgICAgOC44NjkgW21zXSAobWVhbiwgYWNyb3NzIGFsbCBjb25jdXJyZW50IHJlcXVlc3RzKSJ9"}

尝试改大并发量，这时候出现了问题：

{"widget":"image","config":"e30="}
