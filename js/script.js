/* Golden Moments: prices and fees are kept together here for easy updates. */
const PRICES = {
  sashDeliveryFee: 0,
  photographyDeposit: 1000,
  sashDiscountRate: 0.10,
  sashes: {
    classic: 600,
    custom: 600,
    satin: 600,
    group: 2800,
    sunrise: 600,
    bulk: 5600
  },
  packages: {
    basic: 5000,
    standard: 9500,
    full: 18000
  }
};

const CART_STORAGE_KEY = "goldenMomentsCart";
const BOOKING_STORAGE_KEY = "goldenMomentsBooking";
let pendingBookingDetails = "";

document.addEventListener("DOMContentLoaded", () => {
  const loader = document.querySelector(".site-loader");
  window.setTimeout(() => loader?.classList.add("is-hidden"), 300);

  document.querySelectorAll("[data-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  document.querySelectorAll("[data-sash-price]").forEach((element) => {
    element.textContent = formatCurrency(PRICES.sashes[element.dataset.sashPrice]);
  });
  document.querySelectorAll("[data-package-price-label]").forEach((element) => {
    element.textContent = formatCurrency(PRICES.packages[element.dataset.packagePriceLabel]);
  });
  document.querySelectorAll("[data-booking-package-option]").forEach((element) => {
    element.textContent = `${element.textContent} — ${formatCurrency(PRICES.packages[element.dataset.bookingPackageOption])}`;
  });
  document.querySelectorAll("[data-deposit-price]").forEach((element) => {
    element.textContent = formatCurrency(PRICES.photographyDeposit);
  });
  document.querySelectorAll(".offer-strip strong").forEach((element) => {
    element.textContent = `Book a shoot and get ${PRICES.sashDiscountRate * 100}% off your sash`;
  });

  initializeCart();
  initializeFilters();
  initializeForms();
  initializeBookingDate();
  initializeGallery();
  initializeBackToTop();
});

function readStoredCart() {
  try {
    const stored = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    if (!Array.isArray(stored)) throw new TypeError("Saved cart must be a list.");
    return stored.filter((item) =>
      item && typeof item.id === "string" && typeof item.name === "string" &&
      Number.isFinite(item.price) && item.price >= 0 &&
      (item.type === "sash" || item.type === "booking")
    );
  } catch (error) {
    console.error("Could not read the saved shopping cart.", error);
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    console.error("Could not save the shopping cart in this browser.", error);
  }
}

function initializeCart() {
  const drawer = document.querySelector("[data-cart-drawer]");
  const backdrop = document.querySelector("[data-cart-backdrop]");
  if (!drawer || !backdrop) return;

  let cart = readStoredCart();
  const openCart = () => {
    drawer.classList.add("is-open");
    drawer.classList.toggle("is-empty", cart.length === 0);
    drawer.setAttribute("aria-hidden", "false");
    backdrop.classList.add("is-open");
    document.body.classList.add("cart-open");
    drawer.querySelector("[data-close-cart]")?.focus();
  };
  const closeCart = () => {
    drawer.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("cart-open");
  };

  const renderCart = () => {
    const count = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    document.querySelectorAll("[data-cart-count]").forEach((element) => {
      element.textContent = String(count);
    });
    drawer.classList.toggle("is-empty", cart.length === 0);

    const itemsElement = drawer.querySelector("[data-cart-items]");
    itemsElement.replaceChildren();
    if (cart.length === 0) {
      const empty = document.createElement("p");
      empty.className = "cart-empty";
      empty.textContent = "Your bag is waiting for a little celebration. Add something you love.";
      itemsElement.append(empty);
    } else {
      cart.forEach((item) => {
        const line = document.createElement("div");
        line.className = "cart-line";
        const details = document.createElement("div");
        const title = document.createElement("h3");
        title.textContent = item.name;
        details.append(title);
        if (item.details) {
          const note = document.createElement("p");
          note.textContent = item.details;
          details.append(note);
        }
        if (item.type === "booking") {
          const bookingNote = document.createElement("p");
          bookingNote.textContent = "Package balance paid after your session";
          details.append(bookingNote);
        }
        const price = document.createElement("div");
        price.className = "cart-line-price";
        price.textContent = formatCurrency(item.price * (item.quantity || 1));
        if (item.type === "sash" && item.quantity > 1) {
          const quantity = document.createElement("small");
          quantity.textContent = ` × ${item.quantity}`;
          price.append(quantity);
        }
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "remove-item";
        remove.textContent = "Remove";
        remove.setAttribute("aria-label", `Remove ${item.name} from bag`);
        remove.addEventListener("click", () => {
          cart = cart.filter((cartItem) => cartItem.id !== item.id);
          saveCart(cart);
          renderCart();
        });
        price.append(document.createElement("br"), remove);
        line.append(details, price);
        itemsElement.append(line);
      });
    }
    renderSummary(drawer, cart);
  };

  document.querySelectorAll("[data-open-cart]").forEach((button) => button.addEventListener("click", openCart));
  document.querySelectorAll("[data-close-cart]").forEach((button) => button.addEventListener("click", closeCart));
  backdrop.addEventListener("click", closeCart);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCart();
  });

  document.querySelectorAll("[data-add-product]").forEach((button) => {
    button.addEventListener("click", () => {
      const existing = cart.find((item) => item.id === button.dataset.productId);
      if (existing) existing.quantity = (existing.quantity || 1) + 1;
      else cart.push({
        id: button.dataset.productId,
        name: button.dataset.productName,
        price: PRICES.sashes[button.dataset.productId],
        type: "sash",
        quantity: 1
      });
      saveCart(cart);
      renderCart();
      openCart();
    });
  });

  document.querySelectorAll("[data-add-package]").forEach((button) => {
    button.addEventListener("click", () => {
      cart = cart.filter((item) => item.type !== "booking");
      cart.push({
        id: `booking-${button.dataset.packageId}`,
        name: button.dataset.packageName,
        price: PRICES.packages[button.dataset.packageId],
        type: "booking",
        quantity: 1,
        details: pendingBookingDetails
      });
      pendingBookingDetails = "";
      saveCart(cart);
      renderCart();
      openCart();
    });
  });

  const checkoutForm = drawer.querySelector("[data-checkout-form]");
  checkoutForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = checkoutForm.querySelector("[data-checkout-message]");
    message.classList.remove("is-error");
    if (cart.length === 0) {
      setFormMessage(message, "Add an item to your bag before checking out.", true);
      return;
    }
 const data = Object.fromEntries(new FormData(checkoutForm));

  const sashSubtotal = cart
    .filter((item) => item.type === "sash")
    .reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
  const hasBooking = cart.some((item) => item.type === "booking");
  const discount = hasBooking && sashSubtotal > 0 ? Math.round(sashSubtotal * PRICES.sashDiscountRate) : 0;
  const dueNow = sashSubtotal + PRICES.sashDeliveryFee + (hasBooking ? PRICES.photographyDeposit : 0) - discount;

  const itemLines = cart.map((item) =>
    `- ${item.name} x${item.quantity || 1} (${formatCurrency(item.price * (item.quantity || 1))})` +
    (item.details ? ` [${item.details}]` : "")
  );

  sendToWhatsApp([
    "*New order*",
    `Name: ${data.name}`,
    `Phone: ${data.phone}`,
    `Address: ${data.address}`,
    `Payment: ${data.payment}`,
    "",
    "*Items*",
    ...itemLines,
    "",
    `*Due now: ${formatCurrency(dueNow)}*`
  ]);








    setFormMessage(message, "Thank you! Your order is confirmed. We’ll be in touch shortly.");
    cart = [];
    saveCart(cart);
    renderCart();
    checkoutForm.reset();
  });

  renderCart();
}


function renderSummary(drawer, cart) {
  const summary = drawer.querySelector("[data-cart-summary]");
  summary.replaceChildren();
  if (cart.length === 0) return;

  const sashSubtotal = cart
    .filter((item) => item.type === "sash")
    .reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
  const packageValue = cart
    .filter((item) => item.type === "booking")
    .reduce((sum, item) => sum + item.price, 0);
  const hasBooking = cart.some((item) => item.type === "booking");
  const delivery = sashSubtotal > 0 ? PRICES.sashDeliveryFee : 0;
  const discount = hasBooking && sashSubtotal > 0 ? Math.round(sashSubtotal * PRICES.sashDiscountRate) : 0;
  const dueNow = sashSubtotal + delivery + (hasBooking ? PRICES.photographyDeposit : 0) - discount;

  appendSummaryLine(summary, "Sashes", formatCurrency(sashSubtotal));
  if (packageValue > 0) appendSummaryLine(summary, "Photography package (balance due after session)", formatCurrency(packageValue));
  if (delivery > 0) appendSummaryLine(summary, "Sash delivery", formatCurrency(delivery));
  if (hasBooking) appendSummaryLine(summary, "Photography booking deposit", formatCurrency(PRICES.photographyDeposit));
  if (discount > 0) appendSummaryLine(summary, `Shoot & sash offer (${PRICES.sashDiscountRate * 100}%)`, `−${formatCurrency(discount)}`, "discount");
  appendSummaryLine(summary, "Due now", formatCurrency(dueNow), "total");
}

function appendSummaryLine(parent, label, value, extraClass = "") {
  const row = document.createElement("div");
  row.className = `summary-line ${extraClass}`.trim();
  const labelElement = document.createElement("span");
  labelElement.textContent = label;
  const valueElement = document.createElement("strong");
  valueElement.textContent = value;
  row.append(labelElement, valueElement);
  parent.append(row);
}

function initializeFilters() {
  const buttons = document.querySelectorAll("[data-filter]");
  const products = document.querySelectorAll(".product-item");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((filterButton) => {
        const active = filterButton === button;
        filterButton.classList.toggle("active", active);
        filterButton.setAttribute("aria-pressed", String(active));
      });
      products.forEach((product) => {
        product.classList.toggle("is-filtered", button.dataset.filter !== "all" && product.dataset.category !== button.dataset.filter);
      });
    });
  });
}

function initializeForms() {
  const customForm = document.querySelector("[data-custom-form]");
  customForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = new FormData(customForm);
    const details = `${values.get("name")} · ${values.get("school")} · Class of ${values.get("year")}`;
    const message = customForm.querySelector("[data-custom-message]");
    setFormMessage(message, `Thanks! Your custom sash request (${details}) is ready. We’ll contact you to confirm the design.`);
    customForm.reset();
  });

  const bookingForm = document.querySelector("[data-booking-form]");
  bookingForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = new FormData(bookingForm);
    const packageKey = String(values.get("package"));
    const packageNames = { basic: "Basic", standard: "Standard", full: "Full Graduation Day" };
    const packageName = `${packageNames[packageKey]} — ${formatCurrency(PRICES.packages[packageKey])}`;
    const booking = {
      name: values.get("name"),
      phone: values.get("phone"),
      email: values.get("email"),
      package: packageName,
      date: values.get("date"),
      time: values.get("time"),
      location: values.get("location"),
      message: values.get("message")
    };
    try {
      localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(booking));
    } catch (error) {
      console.error("Could not save the booking details in this browser.", error);
      setFormMessage(bookingForm.querySelector("[data-booking-message]"), "We couldn’t save your request in this browser. Please contact us by phone or email.", true);
      return;
    }
    const packageButton = document.querySelector(`[data-package-id="${packageKey}"]`);
    if (packageButton) {
      pendingBookingDetails = `${booking.date} · ${booking.time} · ${booking.location}`;
      packageButton.click();
    }
    const message = bookingForm.querySelector("[data-booking-message]");
    setFormMessage(message, `Thanks! Your date request is saved and the photography package is in your bag. Your ${formatCurrency(PRICES.photographyDeposit)} deposit is due at checkout; we’ll confirm availability by phone or email.`);
    bookingForm.reset();
  });

  const newsletterForm = document.querySelector("[data-newsletter-form]");
  newsletterForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    setFormMessage(newsletterForm.querySelector("[data-newsletter-message]"), "You’re on the list—thanks for celebrating with us!");
    newsletterForm.reset();
  });
}

function initializeBookingDate() {
  const dateInput = document.querySelector("#bookingDate");
  if (dateInput) {
    const today = new Date();
    dateInput.min = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0")
    ].join("-");
  }
}

function initializeGallery() {
  const modal = document.querySelector("[data-lightbox-modal]");
  const image = modal?.querySelector("[data-lightbox-image]");
  if (!modal || !image) return;
  document.querySelectorAll("[data-lightbox]").forEach((button) => {
    button.addEventListener("click", () => {
      image.src = button.dataset.lightbox;
      modal.classList.add("is-open");
      document.body.style.overflow = "hidden";
      modal.querySelector("[data-lightbox-close]")?.focus();
    });
  });
  const close = () => {
    modal.classList.remove("is-open");
    image.removeAttribute("src");
    document.body.style.overflow = "";
  };
  modal.querySelector("[data-lightbox-close]")?.addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
}

function initializeBackToTop() {
  const button = document.querySelector("[data-back-to-top]");
  if (!button) return;
  window.addEventListener("scroll", () => button.classList.toggle("is-visible", window.scrollY > 450), { passive: true });
  button.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

function setFormMessage(element, message, isError = false) {
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("is-error", isError);
}

function formatCurrency(amount) {
  return `KSh ${new Intl.NumberFormat("en-KE").format(amount)}`;
}


const OWNER_WHATSAPP = "254741480427";

function sendToWhatsApp(lines) {
  const text = lines.join("\n");
  const url = `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}