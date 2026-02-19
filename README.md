# Life Health Secure Access

A high-fidelity, secure healthcare platform featuring a "Modern Organic" Design System and an advanced AI Ecosystem for clinical efficiency.

## 💎 Glass UI Design System

The application utilizes a custom-built **Modern Organic** glassmorphism design system to provide a premium, cohesive user experience. Core components include:

- **GlassCard & GlassModal**: Backdrop-blur surfaces with subtle translucent borders.
- **GlassButton**: Interactive elements with shimmer effects and scale transitions.
- **GlassInput & GlassSelect**: Consistent form controls designed for accessibility and visual depth.
- **GlassTable**: Sophisticated data grids with shimmer loading states.

## 🧠 AI Ecosystem

Integrated advanced AI agents to streamline medical workflows:

- **MedVQA Agent**: Powered by **MedGemma**, performing clinical analysis of medical documents (PDFs) and vision-based diagnostic assistance.
- **Medical ASR**: Real-time voice transcription using specialized models for medical terminology, supporting both file uploads and live WebSockets.
- **Intelligent Chat**: A real-time chat interface with streaming responses and tool-calling visualization for intuitive task execution.
- **Multilingual Accessibility**: Real-time translation of messages based on user language preferences to support global healthcare teams.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS, shadcn/ui.
- **Backend**: FastAPI (Python), SQLAlchemy (Async), Pydantic.
- **AI/ML**: MedGemma, HuggingFace Transformers, Google Translate API.
- **Communication**: WebSockets for real-time Voice-to-Text and Chat.

## 🚀 Getting Started

### Prerequisites
- Node.js & npm (v18+)
- Python 3.10+ (for backend)

### Installation

1. **Clone the repository**:
   ```sh
   git clone <repo-url>
   cd life-health-secure-access
   ```

2. **Frontend Setup**:
   ```sh
   npm i
   npm run dev
   ```

3. **Backend Setup**:
   Navigate to the backend directory and follow the [Backend README](file:///c:/Users/venka/Backend/life_health_crm/README.md).

## 🗺️ Project Structure

- `src/components/`: Reusable Glass UI components.
- `src/pages/`: Modular page views including Dashboard, Events, and Healthcare portals.
- `src/hooks/`: Custom React Query hooks for API interaction.
- `src/services/`: API client configurations.

---
Built with ❤️ for advanced healthcare management.
