# BigQuery Release Notes Hub 🚀

A highly interactive, aesthetically pleasing web application designed to track Google Cloud BigQuery Release Notes in real time, extract granular updates, filter categories dynamically, and instantly share them on X (formerly Twitter) with a custom, feature-rich composer.

---

## ✨ Features

- **🌐 CORS Bypass Proxy Backend**: Uses Python Flask to fetch the official XML feed, dodging browser CORS blocks.
- **⚡ In-Memory Cache**: Stores parsed release notes locally for 1 hour to ensure rapid load times and protect upstream servers.
- **🔍 Granular Update Splitting**: Automatically parses daily release notes using DOM parsing and breaks them down into individual cards categorized by type (**Features**, **Changes**, **Deprecations**, **Fixes**, **General**).
- **📊 Executive Dashboard**: Displays total and category-specific stats with a counting animation upon loading.
- **🐦 X/Twitter Composer Modal**:
  - Automatically formats the selected release note snippet into an optimized Tweet.
  - Implements **X character rules** (links count as exactly 23 characters).
  - Features an **interactive SVG progress ring** that shifts colors (green, amber, red) as you approach the 280-character limit.
  - Allows quick toggling of preconfigured hashtags (`#BigQuery`, `#GoogleCloud`, `#GCP`, `#DataEngineering`).
  - Provides a real-time live preview of the final X post card.
- **🎨 Premium Dark Theme**: Built with glassmorphic cards, glowing background gradients, smooth transitions, and modern Google Fonts (*Outfit* and *Inter*).

---

## 📁 File Structure

```text
├── app.py                  # Flask Application (Proxy, Cache & API Route)
├── requirements.txt        # Python Packages
├── .gitignore              # Version Control Exclusions
├── templates/
│   └── index.html          # Main UI Structure & Modal Layouts
└── static/
    ├── css/
    │   └── style.css       # Core Design System, Animations & Responsive Styles
    └── js/
        └── app.js          # DOM Controller, XML Parser & Share Modal Logic
```

---

## 🛠️ Getting Started

Follow these instructions to run the application locally on your machine.

### Prerequisites

Ensure you have Python 3.x installed.

### Setup and Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/gabreyrom/gabriel-event-talks-app.git
   cd gabriel-event-talks-app
   ```

2. **Create a Virtual Environment**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
   ```

3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the Server**
   ```bash
   python3 app.py
   ```

5. **Access the Web Dashboard**
   Open your browser and navigate to **[http://localhost:5001](http://localhost:5001)**.

---

## 💻 Tech Stack

- **Backend**: Python, Flask, Feedparser, Requests
- **Frontend**: HTML5, Vanilla CSS3 (Custom grids, variables & transitions), JavaScript (Vanilla ES6, DOMParser, Web Intents)
- **Styling**: Google Fonts (*Inter*, *Outfit*, *JetBrains Mono*)
- **Icons**: Custom SVG graphics

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE details if applicable.
