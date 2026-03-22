#!/bin/bash
python generate_data.py
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Then change the **Start Command** on Render to:
```
bash startup.sh