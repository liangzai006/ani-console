#!/usr/bin/env bash

set -Eeuo pipefail

DEFAULT_REPOSITORY="docker.changqingyun.cn/ani/ani-console"
DEFAULT_PLATFORM="linux/amd64"

repository="${IMAGE_REPOSITORY:-$DEFAULT_REPOSITORY}"
platform="${IMAGE_PLATFORM:-$DEFAULT_PLATFORM}"
tool="${IMAGE_BUILD_TOOL:-auto}"
tag=""

usage() {
  cat <<'EOF'
构建 ANI Console 镜像并推送到 Harbor。

用法：
  bash ./scripts/build-and-push-image.sh [选项]

选项：
  --tool auto|docker|buildah  构建工具，默认 auto（Docker 优先）
  --platform OS/ARCH          目标平台，默认 linux/amd64
  --repository REPOSITORY     镜像仓库，默认 docker.changqingyun.cn/ani/ani-console
  --tag YYYYMMDDHHMM          自定义标签，默认当前时间，如 202608011220
  -h, --help                  显示帮助

也可使用环境变量 IMAGE_BUILD_TOOL、IMAGE_PLATFORM、IMAGE_REPOSITORY。
EOF
}

die() {
  printf '错误：%s\n' "$*" >&2
  exit 1
}

while (($# > 0)); do
  case "$1" in
    --tool)
      (($# >= 2)) || die "--tool 缺少参数"
      tool="$2"
      shift 2
      ;;
    --platform)
      (($# >= 2)) || die "--platform 缺少参数"
      platform="$2"
      shift 2
      ;;
    --repository)
      (($# >= 2)) || die "--repository 缺少参数"
      repository="$2"
      shift 2
      ;;
    --tag)
      (($# >= 2)) || die "--tag 缺少参数"
      tag="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "未知参数：$1（使用 --help 查看帮助）"
      ;;
  esac
done

case "$tool" in
  auto|docker|buildah) ;;
  *) die "不支持的构建工具：$tool；可选值为 auto、docker、buildah" ;;
esac

[[ -n "$repository" ]] || die "镜像仓库不能为空"
[[ -n "$platform" ]] || die "目标平台不能为空"

if [[ -z "$tag" ]]; then
  tag="$(date +%Y%m%d%H%M)"
fi
[[ "$tag" =~ ^[0-9]{12}$ ]] || die "标签必须是 YYYYMMDDHHMM 格式的 12 位数字"

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
[[ -f "$project_root/Dockerfile" ]] || die "未找到 $project_root/Dockerfile"

runner=()

tool_works() {
  local candidate="$1"
  shift
  "$@" "$candidate" info >/dev/null 2>&1
}

select_tool() {
  local candidates=()
  local candidate

  if [[ "$tool" == "auto" ]]; then
    candidates=(docker buildah)
  else
    candidates=("$tool")
  fi

  for candidate in "${candidates[@]}"; do
    if command -v "$candidate" >/dev/null 2>&1 && tool_works "$candidate"; then
      tool="$candidate"
      runner=("$candidate")
      return
    fi
  done

  if command -v sudo >/dev/null 2>&1; then
    for candidate in "${candidates[@]}"; do
      if command -v "$candidate" >/dev/null 2>&1 && sudo -n "$candidate" info >/dev/null 2>&1; then
        tool="$candidate"
        runner=(sudo "$candidate")
        return
      fi
    done

    printf '当前用户无法直接运行可用的容器工具，正在请求 sudo 权限。\n'
    sudo -v || die "无法取得 sudo 权限"

    for candidate in "${candidates[@]}"; do
      if command -v "$candidate" >/dev/null 2>&1 && tool_works "$candidate" sudo; then
        tool="$candidate"
        runner=(sudo "$candidate")
        return
      fi
    done
  fi

  if [[ "$tool" == "auto" ]]; then
    die "Docker 和 Buildah 均不可用，或当前用户及 sudo 均无权运行"
  fi
  die "$tool 不可用，或当前用户及 sudo 均无权运行"
}

select_tool

image="${repository}:${tag}"

printf '构建工具：%s\n' "$tool"
printf '执行权限：%s\n' "${runner[*]}"
printf '目标平台：%s\n' "$platform"
printf '镜像地址：%s\n' "$image"

if [[ "${runner[0]}" == "sudo" ]]; then
  printf '提示：推送将通过 sudo 执行；若认证失败，请先运行 sudo %s login docker.changqingyun.cn。\n' "$tool"
fi

case "$tool" in
  docker)
    "${runner[@]}" build \
      --platform "$platform" \
      --tag "$image" \
      "$project_root"
    "${runner[@]}" image inspect "$image" \
      --format 'Image={{index .RepoTags 0}} OS={{.Os}} Architecture={{.Architecture}} Size={{.Size}}'
    "${runner[@]}" push "$image"
    ;;
  buildah)
    "${runner[@]}" build \
      --platform "$platform" \
      --tag "$image" \
      "$project_root"
    "${runner[@]}" inspect --type image "$image" >/dev/null
    "${runner[@]}" push "$image" "docker://$image"
    ;;
esac

printf '\n上传完成：%s\n' "$image"
