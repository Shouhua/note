## git常见的问题(man git-*)
1. 推送远端之前，如何取消最后一次commit
git reset [--hard/soft/mixed] commit
2. merge代码产生的重复commit，但是不同的commit hash
git rebase
git merge