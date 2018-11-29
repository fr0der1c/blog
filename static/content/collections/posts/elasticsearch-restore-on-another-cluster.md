---
title: Elasticsearch 备份并在另一个集群恢复
created_at: 2018-11-07T14:43:21.767Z
tags:
  - Elasticsearch
authors: Frederic Chan
categories: Operation
meta:
  keywords: elasticsearch op
isPage: false
isFeatured: false
hero:
  image: /images/uploads/elsaticsearch_logo.png
excerpt: 最近需要把一个 ES 集群的数据迁移到另一个 ES 集群。写篇文章简要记录一下备份恢复的过程。
---
1. 在 `elasticsearch.yml` 中新增 `path.repo: ["/var/backups"]`，其中 `/var/backups` 为你想要备份到的目录，需要先手动创建。然后重启 ES

2. 新建一个 backup：

{"widget":"qards-code","config":"eyJjb2RlIjoiY3VybCAtWFBVVCBcImh0dHA6Ly9sb2NhbGhvc3Q6OTIwMC9fc25hcHNob3QvbXlfYmFja3VwXCIgXG4tSCAnQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi9qc29uJyBcbi1kJ3ugIFwidHlwZVwiOiBcImZzXCIsoCBcInNldHRpbmdzXCI6IHugIKAgXCJsb2NhdGlvblwiOiBcIi92YXIvYmFja3Vwc1wioCB9fScgXG4tdSBlbGFzdGljOnBhc3N3b3JkIiwibGFuZ3VhZ2UiOiJzaGVsbCJ9"}

3. 新建一个 snapshot：

{"widget":"qards-code","config":"eyJjb2RlIjoiY3VybCAtWCBQVVQgXCJsb2NhbGhvc3Q6OTIwMC9fc25hcHNob3QvbXlfYmFja3VwL3NuYXBzaG90XzE/d2FpdF9mb3JfY29tcGxldGlvbj10cnVlXCIgXG4tSCAnQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi9qc29uJyAtZCd7oCBcImluZGljZXNcIjogXCJhcG0qXCIsoCBcImlnbm9yZV91bmF2YWlsYWJsZVwiOiB0cnVlLKAgXCJpbmNsdWRlX2dsb2JhbF9zdGF0ZVwiOiBmYWxzZX0nIFxuLXUgZWxhc3RpYzpwYXNzd29yZCIsImxhbmd1YWdlIjoic2hlbGwifQ=="}

4. 可以用 `curl "localhost:9200/_snapshot/my_backup/snapshot_1" -u elastic:password` 查看备份的状态：

{"widget":"qards-code","config":"eyJjb2RlIjoie1xuoCBcInNuYXBzaG90c1wiOiBbXG6gIKAge1xuoCCgIKAgXCJzbmFwc2hvdFwiOiBcInNuYXBzaG90XzFcIixcbqAgoCCgIFwidXVpZFwiOiBcImpCWjVJbGg3VGJpQXZuN3k1ckt2S0FcIixcbqAgoCCgIFwidmVyc2lvbl9pZFwiOiA2MDIwNDk5LFxuoCCgIKAgXCJ2ZXJzaW9uXCI6IFwiNi4yLjRcIixcbqAgoCCgIFwiaW5kaWNlc1wiOiBbXG6gIKAgoCCgIFwiYXBtLTYuMy4yLXRyYW5zYWN0aW9uLTIwMTguMTAuMzBcIixcbqAgoCCgIKAgXCJhcG0tNi4zLjItc3Bhbi0yMDE4LjEwLjA2XCIsXG6gIKAgoCBdLFxuoCCgIKAgXCJpbmNsdWRlX2dsb2JhbF9zdGF0ZVwiOiBmYWxzZSxcbqAgoCCgIFwic3RhdGVcIjogXCJTVUNDRVNTXCIsXG6gIKAgoCBcInN0YXJ0X3RpbWVcIjogXCIyMDE4LTExLTA2VDE0OjQyOjM1LjMyNlpcIixcbqAgoCCgIFwic3RhcnRfdGltZV9pbl9taWxsaXNcIjogMTU0MTUxNTM1NTMyNixcbqAgoCCgIFwiZW5kX3RpbWVcIjogXCIyMDE4LTExLTA2VDE2OjIyOjQ0LjAyOFpcIixcbqAgoCCgIFwiZW5kX3RpbWVfaW5fbWlsbGlzXCI6IDE1NDE1MjEzNjQwMjgsXG6gIKAgoCBcImR1cmF0aW9uX2luX21pbGxpc1wiOiA2MDA4NzAyLFxuoCCgIKAgXCJmYWlsdXJlc1wiOiBbXSxcbqAgoCCgIFwic2hhcmRzXCI6IHtcbqAgoCCgIKAgXCJ0b3RhbFwiOiAyMjEsXG6gIKAgoCCgIFwiZmFpbGVkXCI6IDAsXG6gIKAgoCCgIFwic3VjY2Vzc2Z1bFwiOiAyMjFcbqAgoCCgIH1cbqAgoCB9XG6gIF1cbn0ifQ=="}

5. 把 `/var/backups` 打包拷贝到新的服务器并恢复到原位置，然后按照步骤 1、2 新建 backup
6. `curl -X POST /_snapshot/my_backup/snapshot_1/_restore`