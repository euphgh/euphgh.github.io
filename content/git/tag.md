- `git tag`：查看所有的标签
- `git tag -d <tagname>`：自动找到拥有该 tag 的 commit 并删除 tag
- `git tag -a <tagname>`：在当前 commit 添加 tag，需要填写 tag message
- `git fetch --prune --prune-tags <remote>`：同步远程仓库的 tag 信息到本地
