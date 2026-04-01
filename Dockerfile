FROM node:22-slim

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# Copy source and build
COPY tsconfig.json ./
COPY src/ src/
COPY chatgpt-app/ chatgpt-app/
RUN pnpm build

# Run remote server
ENV KONID_REMOTE=1
ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/index.js", "--remote"]
