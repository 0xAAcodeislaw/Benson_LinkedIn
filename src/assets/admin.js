// 后台编辑页逻辑：从 /api/content 拉取内容与 schema，动态生成表单，保存回 Worker。
// 无框架、无依赖；所有文本节点用 textContent，避免 XSS。
(function () {
  "use strict";

  var state = { content: null, schema: null, tabs: [], active: "shared", avatarChanged: false };
  var formEl = document.getElementById("form");
  var tabsEl = document.getElementById("tabs");
  var statusEl = document.getElementById("status");

  function getPath(obj, path) {
    return path.split(".").reduce(function (o, k) {
      return o == null ? undefined : o[k];
    }, obj);
  }

  function setPath(obj, path, val) {
    var keys = path.split(".");
    var cur = obj;
    for (var i = 0; i < keys.length - 1; i++) {
      if (cur[keys[i]] == null || typeof cur[keys[i]] !== "object") cur[keys[i]] = {};
      cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = val;
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function status(msg, kind) {
    statusEl.textContent = msg || "";
    statusEl.className = "status" + (kind ? " " + kind : "");
    if (msg) {
      clearTimeout(status._t);
      status._t = setTimeout(function () {
        statusEl.textContent = "";
      }, 4000);
    }
  }

  // ---- 启动 --------------------------------------------------------------
  fetch("/api/content", { headers: { accept: "application/json" } })
    .then(function (res) {
      if (res.status === 401) {
        location.href = "/admin";
        throw new Error("unauthorized");
      }
      return res.json();
    })
    .then(function (data) {
      state.content = data.content;
      state.schema = data.schema;
      state.tabs = data.tabs;
      renderTabs();
      render();
    })
    .catch(function () {
      formEl.textContent = "加载失败，请刷新页面重试。";
    });

  document.getElementById("save").addEventListener("click", save);
  document.getElementById("logout").addEventListener("click", function () {
    fetch("/api/logout", { method: "POST", headers: { "x-admin-request": "1" } }).then(function () {
      location.href = "/admin";
    });
  });

  // ---- 标签页 ------------------------------------------------------------
  function renderTabs() {
    tabsEl.textContent = "";
    state.tabs.forEach(function (tab) {
      var btn = el("button", null, tab.label);
      btn.type = "button";
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", String(tab.key === state.active));
      btn.addEventListener("click", function () {
        state.active = tab.key;
        renderTabs();
        render();
      });
      tabsEl.appendChild(btn);
    });
  }

  // ---- 表单 --------------------------------------------------------------
  function render() {
    formEl.textContent = "";
    var root = state.active === "shared" ? state.content : state.content.locales[state.active];
    var schema = state.active === "shared" ? state.schema.shared : state.schema.locale;

    if (state.active === "shared") formEl.appendChild(avatarBlock());

    schema.sections.forEach(function (section) {
      var card = el("section", "card");
      card.appendChild(el("h2", null, section.title));
      if (section.note) card.appendChild(el("p", "note", section.note));
      section.fields.forEach(function (field) {
        card.appendChild(fieldEl(field, root));
      });
      formEl.appendChild(card);
    });

    if (state.active === "shared") {
      formEl.appendChild(passwordBlock());
      formEl.appendChild(backupBlock());
    }
  }

  // ---- 备份与撤销 ----
  function backupBlock() {
    var card = el("section", "card");
    card.appendChild(el("h2", null, "备份与撤销"));
    card.appendChild(el("p", "note", "内容只存在 Cloudflare KV。建议定期导出一份 JSON 备份。"));

    var row = el("div", "backup-actions");

    var exp = el("a", "btn ghost", "导出 JSON");
    exp.href = "/api/export";
    exp.setAttribute("download", "");
    row.appendChild(exp);

    var file = el("input");
    file.type = "file";
    file.accept = "application/json,.json";
    file.style.display = "none";
    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        var parsed;
        try {
          parsed = JSON.parse(String(reader.result));
        } catch (e) {
          alert("文件不是合法的 JSON");
          return;
        }
        var content = parsed && parsed.content ? parsed.content : parsed;
        if (!content || !content.locales || !content.profile) {
          alert("文件结构不正确（缺少 locales / profile）");
          return;
        }
        if (!confirm("导入会覆盖当前全部内容，确定继续？")) return;
        fetch("/api/import", {
          method: "POST",
          headers: { "content-type": "application/json", "x-admin-request": "1" },
          body: JSON.stringify({ content: content }),
        })
          .then(function (r) {
            if (!r.ok) throw new Error("导入失败");
            return r.json();
          })
          .then(function () {
            location.reload();
          })
          .catch(function () {
            alert("导入失败");
          });
      };
      reader.readAsText(f);
    });

    var imp = el("button", "btn ghost", "导入 JSON");
    imp.type = "button";
    imp.addEventListener("click", function () {
      file.click();
    });
    row.appendChild(imp);
    row.appendChild(file);

    var restore = el("button", "btn danger", "撤销上次保存");
    restore.type = "button";
    restore.addEventListener("click", function () {
      if (!confirm("恢复到上一次保存之前的内容？当前内容会被覆盖。")) return;
      fetch("/api/restore", { method: "POST", headers: { "x-admin-request": "1" } })
        .then(function (r) {
          if (r.status === 404) throw new Error("没有可恢复的版本");
          if (!r.ok) throw new Error("恢复失败");
          return r.json();
        })
        .then(function () {
          location.reload();
        })
        .catch(function (e) {
          alert(e.message);
        });
    });
    row.appendChild(restore);

    card.appendChild(row);
    return card;
  }

  // ---- 修改密码 ----------------------------------------------------------
  function passwordBlock() {
    var card = el("section", "card");
    card.appendChild(el("h2", null, "修改密码"));
    card.appendChild(el("p", "note", "修改后立即生效，旧密码失效。至少 8 位。"));

    var cur = passwordField("当前密码");
    var next = passwordField("新密码");
    var again = passwordField("确认新密码");
    card.appendChild(cur.wrap);
    card.appendChild(next.wrap);
    card.appendChild(again.wrap);

    var msg = el("p", "note");
    var btn = el("button", "btn", "修改密码");
    btn.type = "button";
    btn.addEventListener("click", function () {
      msg.textContent = "";
      msg.style.color = "";
      if (next.input.value.length < 8) {
        msg.textContent = "新密码至少 8 位。";
        msg.style.color = "#b3261e";
        return;
      }
      if (next.input.value !== again.input.value) {
        msg.textContent = "两次输入的新密码不一致。";
        msg.style.color = "#b3261e";
        return;
      }
      btn.disabled = true;
      fetch("/api/password", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-request": "1" },
        body: JSON.stringify({ current: cur.input.value, next: next.input.value }),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok) throw new Error(data.error || "修改失败");
            return data;
          });
        })
        .then(function () {
          msg.textContent = "密码已修改。";
          msg.style.color = "#057642";
          cur.input.value = "";
          next.input.value = "";
          again.input.value = "";
        })
        .catch(function (err) {
          msg.textContent = err.message;
          msg.style.color = "#b3261e";
        })
        .then(function () {
          btn.disabled = false;
        });
    });
    card.appendChild(btn);
    card.appendChild(msg);

    var all = el("button", "btn danger", "退出所有设备");
    all.type = "button";
    all.style.marginTop = "10px";
    all.addEventListener("click", function () {
      if (!confirm("这会让所有设备上的登录失效，需要重新登录。继续？")) return;
      fetch("/api/logout-all", { method: "POST", headers: { "x-admin-request": "1" } }).then(function () {
        location.href = "/admin";
      });
    });
    card.appendChild(all);
    return card;
  }

  function passwordField(labelText) {
    var wrap = el("div", "field");
    var label = el("label", null, labelText);
    var input = el("input");
    input.type = "password";
    input.autocomplete = "new-password";
    label.appendChild(input);
    wrap.appendChild(label);
    return { wrap: wrap, input: input };
  }

  // 其他语言已填写、当前语言为空 → 提示补翻译
  function missingHere(field, value) {
    if (state.active === "shared") return false;
    var empty = Array.isArray(value) ? value.length === 0 : !value || !String(value).trim();
    if (!empty) return false;
    return Object.keys(state.content.locales).some(function (l) {
      if (l === state.active) return false;
      var v = getPath(state.content.locales[l], field.path);
      if (Array.isArray(v)) return v.length > 0;
      return v != null && String(v).trim() !== "";
    });
  }

  function fieldEl(field, root) {
    var wrap = el("div", "field");
    var id = "f_" + field.path.replace(/[^a-z0-9]/gi, "_");
    var label = el("label", null, field.label);
    label.setAttribute("for", id);
    wrap.appendChild(label);

    var value = getPath(root, field.path);
    var missing = missingHere(field, value);

    if (field.type === "textarea") {
      var ta = el("textarea");
      ta.id = id;
      ta.value = value || "";
      if (missing) ta.classList.add("is-missing");
      ta.addEventListener("input", function () {
        setPath(root, field.path, ta.value);
      });
      wrap.appendChild(ta);
      return wrap;
    }

    if (field.type === "stringList") {
      var list = el("textarea");
      list.id = id;
      list.value = Array.isArray(value) ? value.join("\n") : "";
      if (missing) list.classList.add("is-missing");
      list.addEventListener("input", function () {
        setPath(
          root,
          field.path,
          list.value
            .split("\n")
            .map(function (s) {
              return s.trim();
            })
            .filter(Boolean)
        );
      });
      wrap.appendChild(list);
      return wrap;
    }

    if (field.type === "number") {
      var num = el("input");
      num.type = "number";
      num.id = id;
      num.value = value == null ? "" : value;
      num.addEventListener("input", function () {
        setPath(root, field.path, num.value === "" ? 0 : Number(num.value));
      });
      wrap.appendChild(num);
      return wrap;
    }

    if (field.type === "bool") {
      var row = el("label", "check");
      var cb = el("input");
      cb.type = "checkbox";
      cb.checked = !!value;
      cb.addEventListener("change", function () {
        setPath(root, field.path, cb.checked);
      });
      row.appendChild(cb);
      row.appendChild(el("span", null, field.label));
      wrap.textContent = "";
      wrap.appendChild(row);
      return wrap;
    }

    if (field.type === "color") {
      var rowC = el("div", "color-row");
      var picker = el("input");
      picker.type = "color";
      picker.value = /^#[0-9a-fA-F]{6}$/.test(String(value)) ? value : "#0a66c2";
      var hexText = el("input");
      hexText.type = "text";
      hexText.value = value == null ? "" : value;
      hexText.placeholder = "#0a66c2";
      picker.addEventListener("input", function () {
        hexText.value = picker.value;
        setPath(root, field.path, picker.value);
      });
      hexText.addEventListener("input", function () {
        var v = hexText.value.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(v)) picker.value = v;
        setPath(root, field.path, v);
      });
      rowC.appendChild(picker);
      rowC.appendChild(hexText);
      wrap.appendChild(rowC);
      return wrap;
    }

    if (field.type === "image") {
      wrap.appendChild(imageField(field, root, value));
      return wrap;
    }

    if (field.type === "objectList") {
      wrap.appendChild(objectList(field, root));
      return wrap;
    }

    var input = el("input");
    input.type = "text";
    input.id = id;
    input.value = value == null ? "" : value;
    if (missing) input.classList.add("is-missing");
    input.addEventListener("input", function () {
      setPath(root, field.path, input.value);
    });
    wrap.appendChild(input);
    return wrap;
  }

  function imageField(field, root, value) {
    var box = el("div", "img-field");
    var preview = el("img");
    preview.alt = "";
    if (value) preview.src = value;
    else preview.style.display = "none";
    box.appendChild(preview);

    var actions = el("div", "img-actions");
    var file = el("input");
    file.type = "file";
    file.accept = "image/*";
    file.style.display = "none";

    var pick = el("button", "btn ghost", value ? "更换图片" : "上传图片");
    pick.type = "button";
    pick.addEventListener("click", function () {
      file.click();
    });

    var clear = el("button", "btn danger", "移除");
    clear.type = "button";
    clear.style.display = value ? "" : "none";
    clear.addEventListener("click", function () {
      setPath(root, field.path, "");
      preview.style.display = "none";
      clear.style.display = "none";
      pick.textContent = "上传图片";
    });

    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type)) {
        alert("请选择图片文件");
        return;
      }
      var id = Math.random().toString(36).slice(2, 10);
      compressImage(f, 800, 450)
        .then(function (blob) {
          return fetch("/api/image?id=" + id, {
            method: "POST",
            headers: { "content-type": blob.type || "application/octet-stream", "x-admin-request": "1" },
            body: blob,
          });
        })
        .then(function (res) {
          if (!res.ok) throw new Error("upload failed");
          return res.json();
        })
        .then(function (data) {
          setPath(root, field.path, data.src);
          preview.src = data.src + "?t=" + Date.now();
          preview.style.display = "block";
          clear.style.display = "";
          pick.textContent = "更换图片";
        })
        .catch(function () {
          alert("图片上传失败");
        });
    });

    actions.appendChild(pick);
    actions.appendChild(clear);
    actions.appendChild(file);
    box.appendChild(actions);
    return box;
  }

  function objectList(field, root) {
    var box = el("div");
    var list = getPath(root, field.path);
    if (!Array.isArray(list)) {
      list = [];
      setPath(root, field.path, list);
    }

    list.forEach(function (item, index) {
      var card = el("div", "item");
      var head = el("div", "item-head");
      head.appendChild(el("strong", null, (item[field.itemLabel] || "未命名") + " #" + (index + 1)));
      head.appendChild(el("span", "spacer"));

      var up = el("button", "mini", "↑");
      up.type = "button";
      up.title = "上移";
      up.disabled = index === 0;
      up.addEventListener("click", function () {
        list.splice(index - 1, 0, list.splice(index, 1)[0]);
        render();
      });
      head.appendChild(up);

      var down = el("button", "mini", "↓");
      down.type = "button";
      down.title = "下移";
      down.disabled = index === list.length - 1;
      down.addEventListener("click", function () {
        list.splice(index + 1, 0, list.splice(index, 1)[0]);
        render();
      });
      head.appendChild(down);

      var del = el("button", "mini del", "删除");
      del.type = "button";
      del.addEventListener("click", function () {
        if (!confirm("确定删除这一项？")) return;
        list.splice(index, 1);
        render();
      });
      head.appendChild(del);
      card.appendChild(head);

      field.itemFields.forEach(function (sub) {
        card.appendChild(fieldEl(Object.assign({}, sub, { path: sub.key }), item));
      });

      box.appendChild(card);
    });

    var add = el("button", "add", "＋ " + (field.addLabel || "添加"));
    add.type = "button";
    add.addEventListener("click", function () {
      var blank = {};
      field.itemFields.forEach(function (sub) {
        blank[sub.key] = sub.type === "stringList" ? [] : sub.type === "bool" ? false : sub.type === "number" ? 0 : "";
      });
      list.push(blank);
      render();
    });
    box.appendChild(add);
    return box;
  }

  // ---- 头像 --------------------------------------------------------------
  function avatarBlock() {
    var card = el("section", "card");
    card.appendChild(el("h2", null, "头像"));

    var warn = el(
      "div",
      "warn",
      "修改内容后，简历 PDF（下载按钮）不会自动更新。需要最新版时，用浏览器的「打印 → 存为 PDF」从网站页面导出。"
    );
    card.appendChild(warn);

    var row = el("div", "avatar-row");
    var img = el("img");
    img.alt = "当前头像";
    img.src = "/avatar?v=" + Date.now();
    row.appendChild(img);

    var actions = el("div", "avatar-actions");
    var file = el("input");
    file.type = "file";
    file.accept = "image/*";
    file.style.display = "none";
    file.addEventListener("change", function () {
      if (file.files && file.files[0]) uploadAvatar(file.files[0]);
    });

    var pick = el("button", "btn ghost", "上传新头像");
    pick.type = "button";
    pick.addEventListener("click", function () {
      file.click();
    });

    var reset = el("button", "btn danger", "恢复默认头像");
    reset.type = "button";
    reset.addEventListener("click", function () {
      if (!confirm("恢复为默认的字母头像？")) return;
      fetch("/api/avatar", { method: "DELETE", headers: { "x-admin-request": "1" } }).then(function (res) {
        if (res.ok) {
          state.avatarChanged = true;
          img.src = "/avatar?v=" + Date.now();
          status("已恢复默认头像", "ok");
        } else {
          status("操作失败", "err");
        }
      });
    });

    actions.appendChild(pick);
    actions.appendChild(reset);
    actions.appendChild(file);
    row.appendChild(actions);
    card.appendChild(row);

    var hint = el("p", "note", "建议上传正方形照片，会自动裁剪为 512×512。");
    hint.style.marginTop = "10px";
    card.appendChild(hint);
    return card;
  }

  function uploadAvatar(file) {
    if (!/^image\//.test(file.type)) {
      status("请选择图片文件", "err");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      status("图片过大（上限 8MB）", "err");
      return;
    }
    status("正在处理图片…");
    compressImage(file, 512, 512)
      .then(function (blob) {
        return fetch("/api/avatar", {
          method: "POST",
          headers: { "content-type": blob.type || "application/octet-stream", "x-admin-request": "1" },
          body: blob,
        });
      })
      .then(function (res) {
        if (!res.ok) throw new Error("upload failed");
        state.avatarChanged = true;
        status("头像已更新", "ok");
        render();
      })
      .catch(function () {
        status("头像上传失败", "err");
      });
  }

  function compressImage(file, targetW, targetH) {
    var w0 = targetW || 512;
    var h0 = targetH || 512;
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement("canvas");
        canvas.width = w0;
        canvas.height = h0;
        var ctx = canvas.getContext("2d");
        var scale = Math.max(w0 / img.width, h0 / img.height);
        var dw = img.width * scale;
        var dh = img.height * scale;
        ctx.drawImage(img, (w0 - dw) / 2, (h0 - dh) / 2, dw, dh);
        URL.revokeObjectURL(url);
        canvas.toBlob(function (blob) {
          if (!blob) {
            reject(new Error("encode failed"));
            return;
          }
          // Safari / iOS 不支持 WebP 编码，会静默回退成 PNG（体积大 10 倍）→ 改用 JPEG
          if (blob.type === "image/webp") {
            resolve(blob);
            return;
          }
          canvas.toBlob(function (jpeg) {
            resolve(jpeg || blob);
          }, "image/jpeg", 0.85);
        }, "image/webp", 0.9);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("decode failed"));
      };
      img.src = url;
    });
  }

  // ---- 保存 --------------------------------------------------------------
  function save() {
    var btn = document.getElementById("save");
    btn.disabled = true;
    status("正在保存…");
    fetch("/api/content", {
      method: "PUT",
      headers: { "content-type": "application/json", "x-admin-request": "1" },
      body: JSON.stringify({ content: state.content }),
    })
      .then(function (res) {
        if (res.status === 401) {
          location.href = "/admin";
          throw new Error("unauthorized");
        }
        if (!res.ok) throw new Error("save failed");
        return res.json();
      })
      .then(function () {
        status("已保存，线上已更新", "ok");
      })
      .catch(function () {
        status("保存失败，请重试", "err");
      })
      .then(function () {
        btn.disabled = false;
      });
  }
})();
