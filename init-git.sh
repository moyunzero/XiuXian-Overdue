#!/bin/bash

# 修仙欠费中 - Git 初始化脚本
# 使用方法：chmod +x init-git.sh && ./init-git.sh

echo "🎮 修仙欠费中 - Git 初始化脚本"
echo "================================"
echo ""

# 检查是否已经是 Git 仓库
if [ -d .git ]; then
    echo "⚠️  检测到已存在 .git 目录"
    read -p "是否要重新初始化？这将删除现有的 Git 历史 (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "❌ 已取消"
        exit 0
    fi
    rm -rf .git
fi

# 初始化 Git 仓库
echo "📦 初始化 Git 仓库..."
git init

# 添加所有文件
echo "📝 添加文件到暂存区..."
git add .

# 显示将要提交的文件
echo ""
echo "📋 将要提交的文件："
git status --short

# 确认提交
echo ""
read -p "是否继续提交？(Y/n): " confirm
if [ "$confirm" = "n" ] || [ "$confirm" = "N" ]; then
    echo "❌ 已取消"
    exit 0
fi

# 创建首次提交
echo ""
echo "💾 创建首次提交..."
git commit -m "🎮 Initial commit: 修仙欠费中 v1.0.0"

# 询问 GitHub 仓库地址
echo ""
echo "🔗 请输入你的 GitHub 仓库地址"
echo "格式示例："
echo "  HTTPS: https://github.com/username/xiuxian-qianfei.git"
echo "  SSH:   git@github.com:username/xiuxian-qianfei.git"
echo ""
read -p "GitHub 仓库地址: " repo_url

if [ -z "$repo_url" ]; then
    echo "⚠️  未输入仓库地址，跳过添加远程仓库"
    echo "✅ Git 初始化完成！"
    echo ""
    echo "📝 后续可以手动添加远程仓库："
    echo "   git remote add origin <你的仓库地址>"
    echo "   git push -u origin main"
    exit 0
fi

# 添加远程仓库
echo ""
echo "🌐 添加远程仓库..."
git remote add origin "$repo_url"

# 设置主分支名称
git branch -M main

# 询问是否立即推送
echo ""
read -p "是否立即推送到 GitHub？(Y/n): " push_confirm
if [ "$push_confirm" = "n" ] || [ "$push_confirm" = "N" ]; then
    echo "✅ Git 初始化完成！"
    echo ""
    echo "📝 后续可以手动推送："
    echo "   git push -u origin main"
    exit 0
fi

# 推送到 GitHub
echo ""
echo "🚀 推送到 GitHub..."
git push -u origin main

echo ""
echo "✅ 完成！项目已成功上传到 GitHub"
echo "🎮 欠费不停，修仙不止！"
