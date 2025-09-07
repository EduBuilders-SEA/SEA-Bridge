def ext_from_name(name: str) -> str:
    name = name or ""
    dot = name.rfind(".")
    return name[dot:].lower() if dot != -1 else ""