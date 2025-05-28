# PowerCloud Extension Documentation

This directory contains comprehensive documentation for developers working on the PowerCloud Chrome extension.

## 📖 Documentation Index

### Getting Started
- **[Developer Onboarding](./DEVELOPER_ONBOARDING.md)** - Complete guide for new developers
- **[Code Style Guide](./CODE_STYLE_GUIDE.md)** - Coding standards and conventions
- **[JSDoc Standards](./JSDOC_STANDARDS.md)** - Documentation standards

### Development Guidelines
- **[Feature Development Guide](./FEATURE_DEVELOPMENT_GUIDE.md)** - Comprehensive guide for creating new features
- **[Navigation Behavior Implementation](./NAVIGATION_BEHAVIOR_IMPLEMENTATION.md)** - Button navigation behavior differentiation
- **[Logging Guidelines](./LOGGING_GUIDELINES.md)** - How to implement proper logging
- **[Documentation Update Guide](./DOCUMENTATION_UPDATE_GUIDE.md)** - How to maintain docs

### Testing
- **[Testing Documentation](./testing/)** - Complete testing guides and procedures
  - [Quick Test Guide](./testing/QUICK_TEST_GUIDE.md) - Fast testing procedures
  - [Page Actions Testing](./testing/PAGE_ACTIONS_TESTING_GUIDE.md) - Feature-specific testing
  - [Health API Testing](./testing/HEALTH_API_TESTING.md) - Health monitoring tests
  - [Testing Pipeline](./testing/TESTING_PIPELINE.md) - Automated testing setup

### Configuration
- **[Configuration Documentation](./configuration/)** - Setup and configuration guides
  - [Adyen Configuration](./configuration/ADYEN_CONFIG.md) - Adyen integration setup

### Historical Records
- **[History](./history/)** - Completed phases and implementation summaries
  - Development phase completions
  - Feature implementation summaries
  - Enhancement documentation

## 🚀 Quick Navigation

### For New Developers
1. Start with [Developer Onboarding](./DEVELOPER_ONBOARDING.md)
2. Review [Code Style Guide](./CODE_STYLE_GUIDE.md)
3. Check [Testing Documentation](./testing/)

### For Testing
1. Use [Quick Test Guide](./testing/QUICK_TEST_GUIDE.md) for immediate testing
2. Reference [Testing Pipeline](./testing/TESTING_PIPELINE.md) for comprehensive testing

### For Configuration
1. Check [Adyen Configuration](./configuration/ADYEN_CONFIG.md) for integration setup
2. Review main [README](../README.md) for basic setup

## 📁 Directory Structure

```
docs/
├── README.md                    # This file - documentation index
├── DEVELOPER_ONBOARDING.md      # New developer guide
├── CODE_STYLE_GUIDE.md         # Coding standards
├── FEATURE_DEVELOPMENT_GUIDE.md # Feature development guide
├── NAVIGATION_BEHAVIOR_IMPLEMENTATION.md # Button navigation behavior
├── JSDOC_STANDARDS.md          # Documentation standards
├── LOGGING_GUIDELINES.md       # Logging best practices
├── DOCUMENTATION_UPDATE_GUIDE.md # How to maintain docs
│
├── testing/                     # Testing documentation
│   ├── QUICK_TEST_GUIDE.md     # Fast testing procedures
│   ├── PAGE_ACTIONS_TESTING_GUIDE.md # Feature testing
│   ├── HEALTH_API_TESTING.md   # Health monitoring tests
│   └── TESTING_PIPELINE.md     # Automated testing
│
├── configuration/               # Configuration guides
│   └── ADYEN_CONFIG.md         # Adyen integration setup
│
└── history/                     # Historical documentation
    ├── PHASE_5.2_COMPLETION.md # UI/UX improvements completion
    ├── AUTH_ERROR_ENHANCEMENT_SUMMARY.md # Auth improvements
    └── ... (other completion summaries)
```

## 📋 Documentation Maintenance

When adding new documentation:
1. Follow the [Documentation Update Guide](./DOCUMENTATION_UPDATE_GUIDE.md)
2. Update this index with new files
3. Use appropriate JSDoc formatting per [JSDoc Standards](./JSDOC_STANDARDS.md)
4. Add cross-references where helpful

## 🔗 Related Documentation

- **[Main README](../README.md)** - Project overview and basic setup
- **[Architecture Guide](../ARCHITECTURE.md)** - Technical architecture details
- **[Development Notes](../DEVELOPMENT_NOTES.md)** - Current development context
- **[Improvement Plan](../IMPROVEMENT_PLAN.md)** - Future development roadmap
