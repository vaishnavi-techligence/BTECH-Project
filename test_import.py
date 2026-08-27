import sys
import traceback

def main():
    try:
        import sentence_transformers
        print("Success")
    except Exception as e:
        with open("error_log.txt", "w") as f:
            traceback.print_exc(file=f)
            
if __name__ == "__main__":
    main()
