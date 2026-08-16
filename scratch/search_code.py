def find_end_of_gs(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    print(f"Total lines: {len(lines)}")
    for i in range(len(lines) - 30, len(lines)):
        print(f"{i+1}: {lines[i].strip()}")

find_end_of_gs(r"c:\Users\itsbh\Desktop\Naman Mishra\Web Project\new checklist\NewChecklist-Deleagtion\Code.gs\code.gs")
