/* RuntimeDebugUI, ported to the browser.
 *
 * This is a faithful port of the control model in
 * github.com/hisham-CSS/unity-runtimedebugui, not a lookalike. The config shape
 * is the same one the Unity package uses: a tab is a name plus a list of
 * controls, and a control is a type, a getter, a setter and some presentation.
 * Slider, Toggle, InfoDisplay and Vector are the package's four control types.
 * Button is the fifth that Gleamwood's upstreaming notes propose adding, and
 * this port is where it gets proved out before it goes into the C# package.
 *
 * It is also the reason the playground has no bespoke control panels. Every
 * demo on the page declares its tunables and this file builds the panel, which
 * is the actual claim the package makes. A visitor tuning the WFC generator is
 * using the same design that tunes the player in Gleamwood.
 *
 * No dependencies, no build step, same as the rest of the site.
 */
(function (global) {
  "use strict";

  var ControlType = {
    Slider: "slider",
    Toggle: "toggle",
    InfoDisplay: "info",
    Vector: "vector",
    Button: "button",
  };

  /* ----------------------------------------------------------------------
   * Tunable: the declarative half.
   *
   * The Unity side spells this as a C# attribute, [Tunable(tab, min, max)], and
   * reflects over the fields at startup. JavaScript has no attributes, so the
   * equivalent is a schema object registered against the target. The important
   * property is preserved: a demo adds a tunable field and the panel follows,
   * with no UI code edited anywhere.
   * -------------------------------------------------------------------- */

  var Tunable = {
    targets: [],

    /* schema maps a property name on `target` to its presentation:
     *   { tab, section, label, tooltip, min, max, step, whole, save, onChanged }
     * A boolean property becomes a Toggle, a number becomes a Slider, and an
     * object with x and y becomes a Vector. The type is inferred from the
     * current value rather than declared, which is what makes the call site
     * short enough that people actually use it.
     */
    register: function (target, schema) {
      var entry = Tunable.of(target, schema);
      Tunable.targets.push(entry);
      return entry;
    },

    /* The same declaration without joining the global registry. A page with
     * more than one panel on it wants this: TunableRegistry is process-wide by
     * design, which is right in a game with one debug panel and wrong here,
     * where three demos would each inherit the other two's controls. */
    of: function (target, schema) {
      return { target: target, schema: schema };
    },

    clear: function () {
      Tunable.targets.length = 0;
    },

    /* Reflect registered targets into tab configs. Mirrors TunableTabs.Build. */
    build: function (extra) {
      var all = (extra || []).concat(Tunable.targets);
      var byTab = {};
      var order = [];

      all.forEach(function (entry) {
        var target = entry.target;
        var schema = entry.schema;

        Object.keys(schema).forEach(function (prop) {
          var meta = schema[prop];
          var tabName = meta.tab || "General";
          if (!byTab[tabName]) {
            byTab[tabName] = { name: tabName, displayName: tabName, controls: [] };
            order.push(tabName);
          }

          var current = target[prop];
          var type = meta.type;
          if (!type) {
            if (typeof current === "boolean") type = ControlType.Toggle;
            else if (typeof current === "function") type = ControlType.Button;
            else if (current && typeof current === "object" && "x" in current) type = ControlType.Vector;
            else type = ControlType.Slider;
          }

          byTab[tabName].controls.push({
            name: prop,
            displayName: meta.label || humanise(prop),
            tooltip: meta.tooltip,
            sectionName: meta.section,
            type: type,
            minValue: meta.min,
            maxValue: meta.max,
            step: meta.step,
            wholeNumbers: meta.whole,
            saveValue: meta.save !== false,
            saveKey: meta.saveKey,
            options: meta.options,
            getter: function () {
              return target[prop];
            },
            setter: function (v) {
              target[prop] = v;
              if (meta.onChanged) meta.onChanged(v, target);
            },
          });
        });
      });

      return order.map(function (n) {
        return byTab[n];
      });
    },
  };

  /* runSpeed -> Run speed. Cheap, and it means a schema entry usually needs no
   * label at all. */
  function humanise(prop) {
    var s = prop.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ----------------------------------------------------------------------
   * DebugUI
   * -------------------------------------------------------------------- */

  function DebugUI(opts) {
    opts = opts || {};
    this.mount = opts.mount;
    this.title = opts.title || "Debug";
    this.storageKey = opts.storageKey || null;
    this.precision = opts.precision == null ? 2 : opts.precision;
    this.saveDelay = opts.saveDelay == null ? 400 : opts.saveDelay;

    this.tabs = [];
    this.controls = [];
    this.activeTab = 0;
    this._saveTimer = null;
    this._pending = {};
    this._saved = this._load();

    this._buildShell();
  }

  DebugUI.prototype._buildShell = function () {
    var self = this;

    var root = el("div", "dbg");
    var head = el("div", "dbg-head");
    head.appendChild(el("span", "dbg-title", this.title));

    var status = el("span", "dbg-status");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    head.appendChild(status);
    this.statusEl = status;

    if (this.storageKey) {
      var reset = el("button", "dbg-reset", "Reset");
      reset.type = "button";
      reset.title = "Discard saved values and restore the defaults";
      reset.addEventListener("click", function () {
        self.resetAll();
      });
      head.appendChild(reset);
    }

    root.appendChild(head);

    this.tabStrip = el("div", "dbg-tabs");
    this.tabStrip.setAttribute("role", "tablist");
    root.appendChild(this.tabStrip);

    this.body = el("div", "dbg-body");
    root.appendChild(this.body);

    this.root = root;
    if (this.mount) this.mount.appendChild(root);
  };

  /* Mirrors AddTab(DebugTabConfig). */
  DebugUI.prototype.addTab = function (config) {
    var self = this;
    var index = this.tabs.length;

    var btn = el("button", "dbg-tab", config.displayName || config.name);
    btn.type = "button";
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", index === 0 ? "true" : "false");
    btn.addEventListener("click", function () {
      self.selectTab(index);
    });
    this.tabStrip.appendChild(btn);

    var pane = el("div", "dbg-pane");
    pane.setAttribute("role", "tabpanel");
    if (index !== 0) pane.hidden = true;
    this.body.appendChild(pane);

    var sections = {};
    (config.controls || []).forEach(function (control) {
      var host = pane;
      if (control.sectionName) {
        if (!sections[control.sectionName]) {
          var sec = el("div", "dbg-section");
          sec.appendChild(el("p", "dbg-section-title", control.sectionName));
          pane.appendChild(sec);
          sections[control.sectionName] = sec;
        }
        host = sections[control.sectionName];
      }
      self._buildControl(host, config, control);
    });

    this.tabs.push({ config: config, button: btn, pane: pane });
    if (this.tabStrip.childNodes.length === 1) this.selectTab(0);
    return this;
  };

  /* Mirrors AddTabsFrom(params object[]). The Gleamwood hook, and the thing
   * worth upstreaming: hand it objects, get a panel. */
  DebugUI.prototype.addTabsFrom = function () {
    var extra = [];
    for (var i = 0; i < arguments.length; i++) {
      var a = arguments[i];
      if (a && a.target && a.schema) extra.push(a);
    }
    var self = this;
    Tunable.build(extra).forEach(function (tab) {
      self.addTab(tab);
    });
    return this;
  };

  DebugUI.prototype.selectTab = function (index) {
    this.tabs.forEach(function (t, i) {
      var on = i === index;
      t.button.setAttribute("aria-selected", on ? "true" : "false");
      t.button.classList.toggle("is-active", on);
      t.pane.hidden = !on;
    });
    this.activeTab = index;
  };

  DebugUI.prototype._key = function (tab, control) {
    return control.saveKey || tab.name + "." + control.name;
  };

  DebugUI.prototype._buildControl = function (host, tab, control) {
    var self = this;
    var key = this._key(tab, control);
    var row = el("div", "dbg-row dbg-" + control.type);

    /* Saved values are applied before the control is built so the widget and
     * the model start out agreeing. */
    if (control.saveValue && this.storageKey && key in this._saved && control.setter) {
      var restored = this._saved[key];
      if (restored !== null && restored !== undefined) {
        try {
          control.setter(restored);
        } catch (e) {
          /* A saved value from an older schema is not worth breaking over. */
        }
      }
    }

    if (control.type === ControlType.Button) {
      var b = el("button", "dbg-btn", control.displayName || control.name);
      b.type = "button";
      if (control.tooltip) attachTip(b, control.tooltip);
      b.addEventListener("click", function () {
        var fn = control.action || control.getter();
        if (typeof fn === "function") fn();
      });
      row.appendChild(b);
      host.appendChild(row);
      this.controls.push({ tab: tab, control: control, refresh: function () {} });
      return;
    }

    var label = el("label", "dbg-label");
    var labelText = el("span", "dbg-label-text", control.displayName || control.name);
    label.appendChild(labelText);
    if (control.tooltip) attachTip(labelText, control.tooltip);

    var value = el("span", "dbg-value");
    label.appendChild(value);
    row.appendChild(label);

    var refresh;

    if (control.type === ControlType.InfoDisplay) {
      value.classList.add("dbg-value-info");
      refresh = function () {
        var v = control.getter();
        value.textContent = v == null ? "" : String(v);
      };
    } else if (control.type === ControlType.Toggle) {
      var cb = el("input");
      cb.type = "checkbox";
      cb.className = "dbg-check";
      cb.checked = !!control.getter();
      cb.addEventListener("change", function () {
        control.setter(cb.checked);
        self._queueSave(key, cb.checked, control);
      });
      value.appendChild(cb);
      refresh = function () {
        cb.checked = !!control.getter();
      };
    } else if (control.type === ControlType.Vector) {
      var axes = ["x", "y"];
      var inputs = {};
      var wrap = el("div", "dbg-vec");
      axes.forEach(function (axis) {
        var field = el("label", "dbg-vec-field");
        field.appendChild(el("span", "dbg-vec-axis", axis));
        var input = el("input");
        input.type = "number";
        input.step = control.step || "any";
        input.className = "dbg-num";
        input.value = fmt(control.getter()[axis], self.precision);
        input.addEventListener("input", function () {
          var next = control.getter();
          var copy = { x: next.x, y: next.y };
          copy[axis] = parseFloat(input.value);
          if (isNaN(copy[axis])) return;
          control.setter(copy);
          self._queueSave(key, copy, control);
        });
        inputs[axis] = input;
        field.appendChild(input);
        wrap.appendChild(field);
      });
      row.appendChild(wrap);
      refresh = function () {
        var v = control.getter();
        axes.forEach(function (axis) {
          if (document.activeElement !== inputs[axis]) {
            inputs[axis].value = fmt(v[axis], self.precision);
          }
        });
      };
    } else {
      /* Slider. wholeNumbers is the package's SliderInt, and minGetter and
       * maxGetter let a range depend on another control, which is how the WFC
       * demo keeps its seed count below its grid area. */
      var range = el("input");
      range.type = "range";
      range.className = "dbg-range";
      var whole = !!control.wholeNumbers;

      var applyRange = function () {
        var lo = control.minGetter ? control.minGetter() : control.minValue;
        var hi = control.maxGetter ? control.maxGetter() : control.maxValue;
        range.min = lo == null ? 0 : lo;
        range.max = hi == null ? 1 : hi;
        range.step = control.step != null ? control.step : whole ? 1 : (range.max - range.min) / 200;
      };
      applyRange();
      range.value = control.getter();

      var show = function (v) {
        value.textContent = whole ? String(Math.round(v)) : fmt(v, self.precision);
      };
      show(control.getter());

      range.addEventListener("input", function () {
        var v = parseFloat(range.value);
        if (whole) v = Math.round(v);
        control.setter(v);
        show(v);
        self._queueSave(key, v, control);
      });
      row.appendChild(range);

      refresh = function () {
        applyRange();
        var v = control.getter();
        if (document.activeElement !== range) range.value = v;
        show(v);
      };
    }

    host.appendChild(row);
    /* Paint once now. Without this an info display sits blank until the demo's
     * first frame, which on a panel below the fold can be a long time. */
    refresh();
    this.controls.push({ tab: tab, control: control, refresh: refresh });
  };

  /* Called from each demo's frame loop. Only autoRefresh controls and the
   * visible tab do any work, which keeps this off the frame budget. */
  DebugUI.prototype.refresh = function () {
    var active = this.tabs[this.activeTab];
    if (!active) return;
    for (var i = 0; i < this.controls.length; i++) {
      var c = this.controls[i];
      if (c.tab !== active.config) continue;
      if (c.control.autoRefresh || c.control.type === ControlType.InfoDisplay) c.refresh();
    }
  };

  /* Refresh everything, for when a demo changes values behind the panel's back
   * (a regenerate button that also reseeds, for instance). */
  DebugUI.prototype.refreshAll = function () {
    this.controls.forEach(function (c) {
      c.refresh();
    });
  };

  /* ----------------------------------------------------------------------
   * Persistence. Debounced, because a slider drag is a stream of input events
   * and writing on every one of them is the behaviour the Unity package
   * specifically avoids.
   * -------------------------------------------------------------------- */

  DebugUI.prototype._queueSave = function (key, value, control) {
    if (!this.storageKey || !control.saveValue) return;
    var self = this;
    this._pending[key] = value;
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(function () {
      self._flush();
    }, this.saveDelay);
  };

  DebugUI.prototype._flush = function () {
    if (!this.storageKey) return;
    var self = this;
    Object.keys(this._pending).forEach(function (k) {
      self._saved[k] = self._pending[k];
    });
    this._pending = {};
    try {
      global.localStorage.setItem(this.storageKey, JSON.stringify(this._saved));
      this._flash("Saved");
    } catch (e) {
      /* Private browsing, a full quota, or storage disabled by policy. The
       * panel still works, it just forgets. Say so rather than throwing. */
      this._flash("Not saved");
    }
  };

  DebugUI.prototype._load = function () {
    if (!this.storageKey) return {};
    try {
      return JSON.parse(global.localStorage.getItem(this.storageKey)) || {};
    } catch (e) {
      return {};
    }
  };

  DebugUI.prototype.resetAll = function () {
    if (this.storageKey) {
      try {
        global.localStorage.removeItem(this.storageKey);
      } catch (e) {
        /* Nothing to do: there was nothing stored to begin with. */
      }
    }
    this._saved = {};
    this._pending = {};
    this.controls.forEach(function (c) {
      if (c.control.defaultValue !== undefined && c.control.setter) {
        c.control.setter(c.control.defaultValue);
      }
    });
    this.refreshAll();
    this._flash("Reset");
    if (this.onReset) this.onReset();
  };

  DebugUI.prototype._flash = function (text) {
    var self = this;
    this.statusEl.textContent = text;
    this.statusEl.classList.add("is-on");
    if (this._flashTimer) clearTimeout(this._flashTimer);
    this._flashTimer = setTimeout(function () {
      self.statusEl.classList.remove("is-on");
      self.statusEl.textContent = "";
    }, 1200);
  };

  /* Runtime tooltips. The Unity package makes a point of these working in
   * builds and not just in the editor, so the port keeps them rather than
   * leaning on the title attribute, which never shows on touch. */
  function attachTip(node, text) {
    node.classList.add("dbg-has-tip");
    node.setAttribute("tabindex", "0");
    var tip = el("span", "dbg-tip", text);
    tip.setAttribute("role", "tooltip");
    node.appendChild(tip);
  }

  function fmt(v, precision) {
    if (typeof v !== "number" || !isFinite(v)) return String(v);
    var s = v.toFixed(precision);
    /* Trim a trailing .00 so an integer reads as an integer. */
    return s.replace(/\.?0+$/, "") || "0";
  }

  global.CSDebugUI = {
    DebugUI: DebugUI,
    Tunable: Tunable,
    ControlType: ControlType,
    humanise: humanise,
  };
})(window);
