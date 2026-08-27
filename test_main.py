import traceback
try:
    import main
    print("Success")
except Exception as e:
    with open("error_main.log", "w") as f:
        traceback.print_exc(file=f)
