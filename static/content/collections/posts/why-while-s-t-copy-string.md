---
title: 为什么 while (*s++ = *t++); 的作用是复制字符串？
created_at: 2019-01-18T14:06:35.014Z
tags:
  - C
authors: Frederic Chan
categories: Misc
meta:
  keywords: about
isPage: false
isFeatured: false
hero:
  image: /images/uploads/wx20190118-215721-2x.jpg
excerpt: >-
  今天在网上看到一个问题：为什么 while (*s++ = *t++); 的作用是复制字符串？因为自己 C
  语言功底不好，所以也经过了一番搜索才得到答案。在这里记录一下。
---
`a = \*t++;` 表示 `a = \*t`; 接着 `++t`; 

同理，`\*s++ = a`; 表示 `\*s = a;` 之后 `++s;`

所以 `\*s++ = \*t++;` 等价于：


{"widget":"qards-code","config":"eyJjb2RlIjoiYSA9ICp0O1xuKyt0O1xuKnMgPSBhO1xuKytzOyAiLCJsYW5ndWFnZSI6ImMifQ=="}


所以上面的语句每执行一次，便把当前 \*t 的值赋给 \*s，接着地址 t 和 s 前移一位。因此利用 while 循环即可实现字符串的复制。


关于跳出循环，`while(a = b) {}` 表示 `a = b; while(a) { }`。

所以当 `b` 的值为 `0` 时跳出循环。即当 `*t` 为字符串末尾的结束符`\0`时，`*s = \0`; 因为`\0`在 ASCII 码中编码为 `0`，之后执行 `while(0){}` 跳出循环。

所以源代码可以等价为：


{"widget":"qards-code","config":"eyJjb2RlIjoiZm9yICggOyAqczsgcysrLCB0KyspIHtcbiAgICAqcyA9ICp0O1xufSIsImxhbmd1YWdlIjoiYyJ9"}
