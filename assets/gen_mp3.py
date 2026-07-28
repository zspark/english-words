import json
import os
from pathlib import Path
from openai import OpenAI


def batch_generate_mp3(
    words_str: str,
    api_key: str,
    json_path: str = "__audios__.json",
    audio_dir: str = "./audio_files",
):
    """处理单词列表：生成 MP3 音频文件并同步更新 JSON 文件。

    :param words_str: 以逗号分隔的单词或短语字符串
    :param api_key: OpenAI API Key
    :param json_path: 本地 JSON 记录文件的保存路径
    :param audio_dir: MP3 音频文件的保存目录
    """
    # 1. 初始化客户端与目录
    client = OpenAI(api_key=api_key)
    os.makedirs(audio_dir, exist_ok=True)

    # 2. 读取已有的 JSON 文件（不存在则新建）
    json_file = Path(json_path)
    if json_file.exists():
        with open(json_file, "r", encoding="utf-8") as f:
            try:
                processed_words = json.load(f)
            except json.JSONDecodeError:
                processed_words = {}
    else:
        processed_words = {}

    # 3. 解析并清洗输入的单词列表
    raw_words = [w.strip().lower() for w in words_str.split(",") if w.strip()]
    
    # print(raw_words)
   
    # 4. 遍历处理
    for word in raw_words:
        # 查重：如果在 JSON 中则跳过
        if word in processed_words:
            print(f"⏩ 跳过: '{word}' (已存在于 JSON 中)")
            continue

        print(f"🔄 正在生成音频: '{word}'...")
        mp3_path = Path(audio_dir) / f"{word}.mp3"

        try:
            # 调用 TTS 接口生成音频
            response = client.audio.speech.create(
                model="gpt-4o-mini-tts",  # 可选 "tts-1-hd" 获取更高音质
                voice="alloy",  # 可选: alloy, echo, fable, onyx, nova, shimmer
                input=word,
            )

            # 保存文件
            response.stream_to_file(mp3_path)

            # 更新内存中的记录
            processed_words[word] = True
            print(f"  └─ ✅ 已保存: {mp3_path}")

        except Exception as e:
            print(f"  └─ ❌ 生成失败 '{word}': {e}")

    # 5. 覆盖保存 JSON 文件
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(processed_words, f, ensure_ascii=False, indent=4)

    print(f"\n🎉 处理完毕！JSON 已更新保存至: {json_file.resolve()}")


# ================= 使用示例 =================
if __name__ == "__main__":
    MY_API_KEY = "api-key-here"

    words_input = "bagpack,emphasis,plow,mother"

    batch_generate_mp3(
        words_str=words_input,
        api_key=MY_API_KEY,
        json_path="../www/audio/__audios__.json",  # JSON 路径
        audio_dir="../www/audio",  # MP3 输出路径
    )