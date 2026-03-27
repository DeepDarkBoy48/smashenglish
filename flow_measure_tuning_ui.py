import tkinter as tk
from tkinter import ttk


class FlowMeasureTuningUI(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("流量测量调节系统")
        self.geometry("860x520")
        self.resizable(False, False)

        self._build_vars()
        self._build_ui()

    def _build_vars(self):
        self.valve_diameter = tk.StringVar(value="32")
        self.valve_offset = tk.StringVar(value="0")
        self.target_flow = tk.StringVar(value="10")
        self.tolerance = tk.StringVar(value="0.5")

        self.upstream_pressure = tk.StringVar()
        self.downstream_pressure = tk.StringVar()
        self.opening = tk.StringVar()
        self.instant_flow = tk.StringVar()
        self.kv = tk.StringVar()

    def _build_ui(self):
        container = ttk.Frame(self, padding=(10, 8, 10, 10))
        container.pack(fill=tk.BOTH, expand=True)

        title = ttk.Label(container, text="流量测量调节系统", font=("Microsoft YaHei", 20))
        title.grid(row=0, column=0, columnspan=12, pady=(2, 10))

        sep_top = ttk.Separator(container, orient="horizontal")
        sep_top.grid(row=1, column=0, columnspan=12, sticky="ew", pady=(0, 8))

        ttk.Label(container, text="请将阀门定位到").grid(row=2, column=0, sticky="w", padx=(2, 6), pady=4)
        ttk.Button(container, text="打开", width=7, command=lambda: None).grid(row=2, column=1, sticky="w", padx=(0, 12))

        ttk.Label(container, text="阀门通径").grid(row=2, column=2, sticky="e")
        ttk.Combobox(
            container,
            width=8,
            state="readonly",
            textvariable=self.valve_diameter,
            values=["15", "20", "25", "32", "40", "50", "65"],
        ).grid(row=2, column=3, sticky="w", padx=(4, 12))

        ttk.Label(container, text="阀杆补偿").grid(row=2, column=4, sticky="e")
        ttk.Combobox(
            container,
            width=8,
            textvariable=self.valve_offset,
            values=[str(i) for i in range(-10, 11)],
        ).grid(row=2, column=5, sticky="w", padx=(4, 6))
        ttk.Label(container, text="（可输入 + / - 调整）").grid(row=2, column=6, columnspan=3, sticky="w")

        ttk.Label(container, text="流量调节", font=("Microsoft YaHei", 10)).grid(
            row=3, column=0, columnspan=12, sticky="w", pady=(10, 2)
        )

        ttk.Label(container, text="调节方向").grid(row=4, column=0, sticky="w", padx=(2, 6), pady=4)
        ttk.Button(container, text="开始", width=7, command=lambda: None).grid(row=4, column=1, sticky="w", padx=(0, 12))

        ttk.Label(container, text="目标流量").grid(row=4, column=2, sticky="e")
        ttk.Entry(container, width=14, textvariable=self.target_flow).grid(row=4, column=3, sticky="w", padx=(4, 4))
        ttk.Label(container, text="m3/h").grid(row=4, column=4, sticky="w", padx=(0, 12))

        ttk.Label(container, text="允许误差").grid(row=4, column=5, sticky="e")
        ttk.Entry(container, width=14, textvariable=self.tolerance).grid(row=4, column=6, sticky="w", padx=(4, 4))
        ttk.Label(container, text="% ").grid(row=4, column=7, sticky="w")

        ttk.Label(container, text="监测与参数设置", font=("Microsoft YaHei", 10)).grid(
            row=5, column=0, columnspan=12, sticky="w", pady=(10, 2)
        )

        ttk.Label(container, text="阀前压力").grid(row=6, column=0, sticky="w", padx=(2, 6), pady=4)
        ttk.Entry(container, width=16, textvariable=self.upstream_pressure).grid(row=6, column=1, columnspan=2, sticky="w")
        ttk.Label(container, text="kPa").grid(row=6, column=3, sticky="w", padx=(4, 12))

        ttk.Label(container, text="阀后压力").grid(row=6, column=4, sticky="w", padx=(2, 6))
        ttk.Entry(container, width=16, textvariable=self.downstream_pressure).grid(row=6, column=5, columnspan=2, sticky="w")
        ttk.Label(container, text="kPa").grid(row=6, column=7, sticky="w", padx=(4, 12))

        ttk.Label(container, text="当前开度").grid(row=6, column=8, sticky="w", padx=(2, 6))
        ttk.Entry(container, width=14, textvariable=self.opening).grid(row=6, column=9, sticky="w")
        ttk.Label(container, text="% ").grid(row=6, column=10, sticky="w", padx=(4, 0))

        ttk.Label(container, text="瞬时流量").grid(row=7, column=0, sticky="w", padx=(2, 6), pady=4)
        ttk.Entry(container, width=16, textvariable=self.instant_flow).grid(row=7, column=1, columnspan=2, sticky="w")
        ttk.Label(container, text="m3/h").grid(row=7, column=3, sticky="w", padx=(4, 12))

        ttk.Label(container, text="Kv").grid(row=7, column=4, sticky="w", padx=(2, 6))
        ttk.Entry(container, width=16, textvariable=self.kv).grid(row=7, column=5, columnspan=2, sticky="w")

        ttk.Label(container, text="控制记录").grid(row=8, column=0, columnspan=12, sticky="w", pady=(8, 4))

        log_frame = ttk.Frame(container, borderwidth=1, relief=tk.SOLID)
        log_frame.grid(row=9, column=0, columnspan=12, sticky="nsew")

        self.log_text = tk.Text(log_frame, width=108, height=14, font=("Consolas", 10))
        self.log_text.pack(fill=tk.BOTH, expand=True)

        container.grid_rowconfigure(9, weight=1)
        for col in range(12):
            container.grid_columnconfigure(col, weight=1)


if __name__ == "__main__":
    app = FlowMeasureTuningUI()
    app.mainloop()
