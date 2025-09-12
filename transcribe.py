import sys
import whisper

# تحميل الموديل (base = خفيف وسريع)
model = whisper.load_model("base")

# استلام مسار الملف الصوتي من Node.js
audio_path = sys.argv[1]

# تنفيذ التفريغ باللغة العربية
result = model.transcribe(audio_path, language="ar")

# طباعة النص ليقرأه Node.js
print(result["text"])