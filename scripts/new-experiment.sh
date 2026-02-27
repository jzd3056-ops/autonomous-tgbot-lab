#!/bin/bash
# 创建新实验实例
# 用法: ./scripts/new-experiment.sh <experiment-id>
# 示例: ./scripts/new-experiment.sh xhs-gen-0

set -e

if [ -z "$1" ]; then
  echo "用法: $0 <experiment-id>"
  echo "示例: $0 xhs-gen-0"
  exit 1
fi

EXPERIMENT_ID=$1
BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$BASE_DIR/experiments/$EXPERIMENT_ID"

if [ -d "$TARGET" ]; then
  echo "错误: experiments/$EXPERIMENT_ID 已存在"
  exit 1
fi

cp -r "$BASE_DIR/templates/experiment-template" "$TARGET"
rm -f "$TARGET/logs/.gitkeep"

echo "✅ 实验 $EXPERIMENT_ID 已创建: experiments/$EXPERIMENT_ID"
echo ""
echo "下一步:"
echo "  1. 编辑 experiments/$EXPERIMENT_ID/config.md 填写实验配置"
echo "  2. 配置 agent 的 cron 任务"
echo "  3. 启动 agent"
