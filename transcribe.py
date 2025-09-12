#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import json

def main():
    if len(sys.argv) < 2:
        print("استخدام: python transcribe.py <مسار_الملف_الصوتي>")
        sys.exit(1)
    
    audio_path = sys.argv[1]
    
    try:
        import whisper
        # تحميل نموذج Whisper (base للسرعة المعقولة)
        model = whisper.load_model("base")
        
        # تفريغ الملف الصوتي
        result = model.transcribe(audio_path, language="ar")
        
        # إرجاع النص المفرغ
        print(result["text"])
        
    except ImportError:
        # في حالة عدم توفر مكتبة Whisper
        print("خطأ: مكتبة Whisper غير مثبتة. يرجى تثبيتها باستخدام: pip install openai-whisper")
        sys.exit(1)
        
    except Exception as e:
        print(f"خطأ في تفريغ الملف الصوتي: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()