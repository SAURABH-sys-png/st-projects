const blogContainer = document.getElementById("blog-container");
const formSection = document.getElementById("form-section");
const formHeading = document.getElementById("form-heading");
const blogForm = document.getElementById("blog-form");
const blogId = document.getElementById("blog-id");
const titleInput = document.getElementById("title");
const contentInput = document.getElementById("content");

const addBtn = document.getElementById("add-btn");
const editBtn = document.getElementById("edit-btn");
const deleteBtn = document.getElementById("delete-btn");

let blogs = [];
let selectedId = null;
let mode = "add";

async function fetchBlogs() {
  const response = await fetch("/api/blogs");
  if (!response.ok) {
    throw new Error("Failed to fetch blogs");
  }
  blogs = await response.json();
  renderBlogs();
}

function renderBlogs() {
  blogContainer.innerHTML = "";

  if (blogs.length === 0) {
    blogContainer.innerHTML = "<p>No blogs yet. Add your first one.</p>";
    return;
  }

  blogs.forEach((blog) => {
    const article = document.createElement("article");
    article.className = "blog-item";
    if (blog.id === selectedId) {
      article.classList.add("selected");
    }
    article.innerHTML = `<h2>${escapeHtml(blog.title)}</h2><p>${escapeHtml(blog.content)}</p>`;
    article.addEventListener("click", () => {
      selectedId = blog.id;
      renderBlogs();
    });
    blogContainer.appendChild(article);
  });
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function openForm(nextMode, existingBlog) {
  mode = nextMode;
  formSection.classList.remove("hidden");
  formHeading.textContent = mode === "edit" ? "Edit Blog" : "Add a New Blog";
  if (existingBlog) {
    blogId.value = existingBlog.id;
    titleInput.value = existingBlog.title;
    contentInput.value = existingBlog.content;
  } else {
    blogId.value = "";
    titleInput.value = "";
    contentInput.value = "";
  }
}

async function createBlog(payload) {
  const response = await fetch("/api/blogs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Failed to create blog");
  }
}

async function updateBlog(id, payload) {
  const response = await fetch(`/api/blogs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Failed to update blog");
  }
}

async function deleteBlog(id) {
  const response = await fetch(`/api/blogs/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete blog");
  }
}

addBtn.addEventListener("click", () => openForm("add"));

editBtn.addEventListener("click", () => {
  if (!selectedId) {
    alert("Select a blog first.");
    return;
  }
  const existingBlog = blogs.find((blog) => blog.id === selectedId);
  if (!existingBlog) {
    return;
  }
  openForm("edit", existingBlog);
});

deleteBtn.addEventListener("click", async () => {
  if (!selectedId) {
    alert("Select a blog first.");
    return;
  }
  const confirmed = confirm("Delete selected blog?");
  if (!confirmed) {
    return;
  }
  await deleteBlog(selectedId);
  selectedId = null;
  await fetchBlogs();
});

blogForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    title: titleInput.value.trim(),
    content: contentInput.value.trim(),
  };

  if (!payload.title || !payload.content) {
    alert("Title and content are required.");
    return;
  }

  if (mode === "edit") {
    await updateBlog(blogId.value, payload);
  } else {
    await createBlog(payload);
  }

  formSection.classList.add("hidden");
  await fetchBlogs();
});

fetchBlogs().catch((error) => {
  blogContainer.innerHTML = `<p>Could not load blogs: ${error.message}</p>`;
});
