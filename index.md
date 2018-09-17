---
title: Index
tags: ['foss', 'spo600', 'linux', 'kde']
---
## SPO600: Blog

Thanks to the software portability class I have gotten
around to develop my Github Pages website during this term.

I will be posting regular updates on the progress of the class and
topics covered therein.

## Index

{% for post in site.posts reversed %}
1. [{{post.title}}]({{ post.url }})
{% endfor %}

---
