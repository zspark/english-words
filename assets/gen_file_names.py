import json
import os


def save_filenames_to_json(
    target_directory: str, output_json_path: str = "__audios__.json"
):
    """遍历指定目录下的所有文件，提取无扩展名的文件名并保存为 JSON 对象格式。

    :param target_directory: 要遍历的目标目录路径
    :param output_json_path: 输出的 JSON 文件路径，默认当前目录下的 __audios__.json
    """
    # 使用字典存储，格式为 {"filename": True}
    file_dict = {}

    # os.walk 会递归遍历目标目录及所有子目录
    for root, _, files in os.walk(target_directory):
        for file in files:
            # 获取无扩展名的文件名并转为小写（保证匹配一致性）
            name_without_ext, _ = os.path.splitext(file)
            name_key = name_without_ext.strip().lower()

            if name_key:
                file_dict[name_key] = True

    # 将字典写入本地 JSON 文件
    with open(output_json_path, "w", encoding="utf-8") as f:
        # ensure_ascii=False 确保非 ASCII 字符正常显示
        # indent=4 格式化缩进
        json.dump(file_dict, f, ensure_ascii=False, indent=4)

    print(
        f"处理完成！共收集 {len(file_dict)} 个文件名，已保存至: {output_json_path}"
    )


# ================= 使用示例 =================
if __name__ == "__main__":
    target_dir = "../audio"

    # 执行函数
    save_filenames_to_json(target_dir, "__audios__.json")