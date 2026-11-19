export default ({ env }) => ({
  // ... (если у тебя здесь были другие плагины, например 'upload' или 'email', 
  // просто оставь их внутри этой скобки, но добавь блок users-permissions, как ниже)

  'users-permissions': {
    config: {
      register: {
        allowedFields: ['username', 'email', 'password'],
      },
    },
  },

  // ... (остальные плагины)
});