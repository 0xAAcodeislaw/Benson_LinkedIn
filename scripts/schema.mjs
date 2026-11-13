// 后台表单的字段描述。admin 页面据此生成控件，保存时写回的 JSON 结构与 content.json 完全一致。
// 未在此声明的字段（sections 文案、a11y、footer 等）不会被改动，原样保留。

export const sharedSchema = {
  sections: [
    {
      title: "个人资料",
      note: "三种语言共用",
      fields: [
        { path: "profile.name", label: "姓名", type: "text" },
        { path: "profile.initials", label: "头像缩写（1–2 个字母）", type: "text" },
        { path: "profile.email", label: "邮箱", type: "text" },
        { path: "profile.github", label: "GitHub 链接", type: "text" },
        { path: "profile.linkedin", label: "LinkedIn 链接", type: "text" },
      ],
    },
    {
      title: "站点",
      fields: [
        { path: "site.url", label: "站点地址（不含结尾斜杠）", type: "text" },
        { path: "site.author", label: "作者（用于 meta 标签）", type: "text" },
      ],
    },
    {
      title: "外观",
      note: "主色、字号、圆角；保存后立即生效",
      fields: [
        { path: "site.theme.accentLight", label: "主题色（浅色模式）", type: "color" },
        { path: "site.theme.accentDark", label: "主题色（深色模式）", type: "color" },
        { path: "site.theme.baseFontSize", label: "正文字号（12–18）", type: "number" },
        { path: "site.theme.radius", label: "卡片圆角（0–20）", type: "number" },
      ],
    },
  ],
};

export const localeSchema = {
  sections: [
    {
      title: "基本信息",
      fields: [
        { path: "hero.headline", label: "求职标语（姓名下方）", type: "text" },
        { path: "hero.location", label: "所在地", type: "text" },
        { path: "hero.openToWork", label: "求职状态标题", type: "text" },
        { path: "hero.openToWorkDetail", label: "求职状态说明", type: "text" },
        { path: "hero.availability.type", label: "求职类型", type: "text" },
        { path: "hero.availability.start", label: "可入职时间", type: "text" },
        { path: "hero.availability.workAuth", label: "工作授权", type: "text" },
        { path: "hero.btnResume", label: "简历按钮文案", type: "text" },
        { path: "meta.title", label: "网页标题（SEO）", type: "text" },
        { path: "meta.description", label: "网页描述（SEO）", type: "textarea" },
      ],
    },
    {
      title: "关于我",
      fields: [{ path: "about", label: "段落（每行一段）", type: "stringList" }],
    },
    {
      title: "快速信息",
      fields: [
        {
          path: "quickFacts",
          label: "条目",
          type: "objectList",
          itemLabel: "label",
          addLabel: "添加一行",
          itemFields: [
            { key: "label", label: "标签", type: "text" },
            { key: "value", label: "内容", type: "text" },
          ],
        },
      ],
    },
    {
      title: "工作经历",
      fields: [
        {
          path: "experience",
          label: "经历",
          type: "objectList",
          itemLabel: "role",
          addLabel: "添加一段经历",
          itemFields: [
            { key: "role", label: "职位", type: "text" },
            { key: "company", label: "公司 / 机构", type: "text" },
            { key: "period", label: "时间", type: "text" },
            { key: "location", label: "地点", type: "text" },
            { key: "points", label: "工作要点（每行一条）", type: "stringList" },
            { key: "tech", label: "技术栈 / 关键词（每行一个）", type: "stringList" },
          ],
        },
      ],
    },
    {
      title: "教育背景",
      fields: [
        { path: "education.degree", label: "学位 / 专业", type: "text" },
        { path: "education.school", label: "学校", type: "text" },
        { path: "education.period", label: "时间", type: "text" },
        { path: "education.location", label: "地点", type: "text" },
        { path: "education.gpa", label: "GPA", type: "text" },
        { path: "education.honours", label: "荣誉（每行一条）", type: "stringList" },
        { path: "education.details", label: "补充说明（每行一条）", type: "stringList" },
        { path: "education.coursework", label: "主修课程（每行一门，显示为标签）", type: "stringList" },
      ],
    },
    {
      title: "志愿服务",
      fields: [
        {
          path: "volunteering",
          label: "志愿经历",
          type: "objectList",
          itemLabel: "role",
          addLabel: "添加一段志愿经历",
          itemFields: [
            { key: "role", label: "角色", type: "text" },
            { key: "org", label: "组织", type: "text" },
            { key: "period", label: "时间", type: "text" },
            { key: "location", label: "地点", type: "text" },
            { key: "points", label: "做了什么（每行一条）", type: "stringList" },
          ],
        },
      ],
    },
    {
      title: "出版物与写作",
      fields: [
        {
          path: "publications",
          label: "条目",
          type: "objectList",
          itemLabel: "title",
          addLabel: "添加一条",
          itemFields: [
            { key: "title", label: "标题", type: "text" },
            { key: "venue", label: "发表处 / 课程", type: "text" },
            { key: "date", label: "时间", type: "text" },
            { key: "link", label: "链接", type: "text" },
            { key: "description", label: "简介", type: "textarea" },
          ],
        },
      ],
    },
    {
      title: "项目",
      fields: [
        {
          path: "projects",
          label: "项目",
          type: "objectList",
          itemLabel: "name",
          addLabel: "添加一个项目",
          itemFields: [
            { key: "name", label: "项目名", type: "text" },
            { key: "role", label: "角色（如 Course project）", type: "text" },
            { key: "period", label: "时间", type: "text" },
            { key: "link", label: "链接", type: "text" },
            { key: "metric", label: "成果标签（一句话数据）", type: "text" },
            { key: "description", label: "描述", type: "textarea" },
            { key: "tech", label: "技术栈（每行一个）", type: "stringList" },
            { key: "featured", label: "显示为大卡", type: "bool" },
            { key: "image", label: "项目截图", type: "image" },
          ],
        },
      ],
    },
    {
      title: "技能",
      fields: [
        {
          path: "skills",
          label: "技能分组",
          type: "objectList",
          itemLabel: "group",
          addLabel: "添加一组技能",
          itemFields: [
            { key: "group", label: "分组名称", type: "text" },
            { key: "items", label: "技能（每行一个）", type: "stringList" },
          ],
        },
      ],
    },
    {
      title: "兴趣与爱好",
      fields: [{ path: "interests", label: "兴趣（每行一个，显示为标签）", type: "stringList" }],
    },
    {
      title: "证书与奖项",
      fields: [
        {
          path: "certifications",
          label: "证书",
          type: "objectList",
          itemLabel: "name",
          addLabel: "添加证书",
          itemFields: [
            { key: "name", label: "证书名称", type: "text" },
            { key: "issuer", label: "颁发机构", type: "text" },
            { key: "date", label: "时间", type: "text" },
            { key: "link", label: "链接", type: "text" },
          ],
        },
        {
          path: "awards",
          label: "奖项",
          type: "objectList",
          itemLabel: "name",
          addLabel: "添加奖项",
          itemFields: [
            { key: "name", label: "奖项名称", type: "text" },
            { key: "issuer", label: "颁发机构", type: "text" },
            { key: "date", label: "时间", type: "text" },
          ],
        },
      ],
    },
    {
      title: "语言能力",
      fields: [
        {
          path: "languagesList",
          label: "语言",
          type: "objectList",
          itemLabel: "name",
          addLabel: "添加语言",
          itemFields: [
            { key: "name", label: "语言", type: "text" },
            { key: "level", label: "水平描述", type: "text" },
            { key: "cefr", label: "CEFR 等级（如 B1）", type: "text" },
            { key: "pct", label: "进度条百分比（0–100）", type: "number" },
          ],
        },
      ],
    },
    {
      title: "区块标题",
      note: "页面上各区块的大标题；带「窄屏」的是手机上顶栏用的短标签",
      fields: [
        { path: "sections.about", label: "关于我", type: "text" },
        { path: "sections.experience", label: "工作经历", type: "text" },
        { path: "sections.experienceShort", label: "工作经历（窄屏短标签）", type: "text" },
        { path: "sections.education", label: "教育背景", type: "text" },
        { path: "sections.volunteering", label: "志愿服务", type: "text" },
        { path: "sections.publications", label: "出版物与写作", type: "text" },
        { path: "sections.credentials", label: "认证与奖项", type: "text" },
        { path: "sections.credentialsShort", label: "认证与奖项（窄屏短标签）", type: "text" },
        { path: "sections.certifications", label: "证书", type: "text" },
        { path: "sections.awards", label: "奖项", type: "text" },
        { path: "sections.projects", label: "项目作品", type: "text" },
        { path: "sections.moreProjects", label: "其他项目", type: "text" },
        { path: "sections.skills", label: "技能", type: "text" },
        { path: "sections.interests", label: "兴趣与爱好", type: "text" },
        { path: "sections.skillsShort", label: "技能（窄屏短标签）", type: "text" },
        { path: "sections.languages", label: "语言能力", type: "text" },
        { path: "sections.contact", label: "联系方式", type: "text" },
        { path: "sections.quickFacts", label: "快速信息", type: "text" },
        { path: "sections.gpa", label: "GPA 标签", type: "text" },
      ],
    },
    {
      title: "按钮文案",
      fields: [
        { path: "hero.btnEmail", label: "邮件按钮", type: "text" },
        { path: "hero.btnGithub", label: "GitHub 按钮", type: "text" },
        { path: "hero.btnLinkedin", label: "LinkedIn 按钮", type: "text" },
      ],
    },
    {
      title: "联系卡片文案",
      fields: [
        { path: "contact.emailLabel", label: "邮箱标签", type: "text" },
        { path: "contact.copy", label: "复制按钮", type: "text" },
        { path: "contact.copied", label: "复制成功提示", type: "text" },
        { path: "contact.githubLabel", label: "GitHub 标签", type: "text" },
        { path: "contact.linkedinLabel", label: "LinkedIn 标签", type: "text" },
      ],
    },
    {
      title: "页脚与 404 页面",
      fields: [
        { path: "footer", label: "页脚文字", type: "text" },
        { path: "notFound.title", label: "404 网页标题", type: "text" },
        { path: "notFound.text", label: "404 页面提示", type: "text" },
      ],
    },
    {
      title: "无障碍文案",
      note: "屏幕阅读器与键盘用户会读到的提示",
      fields: [
        { path: "a11y.skip", label: "跳到主要内容", type: "text" },
        { path: "a11y.language", label: "语言切换区域", type: "text" },
        { path: "a11y.sections", label: "区块导航区域", type: "text" },
        { path: "a11y.themeToggle", label: "主题切换按钮", type: "text" },
        { path: "a11y.toTop", label: "回到顶部按钮", type: "text" },
      ],
    },
    {
      title: "语言标签",
      note: "右上角语言切换按钮上显示的文字",
      fields: [{ path: "label", label: "按钮文字（如 EN / 中文 / FR）", type: "text" }],
    },
  ],
};

// 前端按语言标签渲染，顺序与站点一致
// 后台标签页由 worker.js 按 content.locales[*].label 动态生成，这里不再写死。
