export default defineAppConfig({
  pages: [
    'pages/auth/index',
    'pages/home/index',
    'pages/product/index',
    'pages/cart/index',
    'pages/order/index',
    'pages/order/detail',
    'pages/wallet/index',
    'pages/profile/index',
    'pages/profile/info/index',
    'pages/referral/index',
    'pages/health/index',
    'pages/payment/web',
    'pages/website/index',
  ],
  tabBar: {
    color: '#999',
    selectedColor: '#1677ff',
    list: [
      { pagePath: 'pages/home/index',    text: 'Home',    iconPath: 'assets/home.png',    selectedIconPath: 'assets/home-active.png' },
      { pagePath: 'pages/cart/index',    text: 'Cart',    iconPath: 'assets/cart.png',    selectedIconPath: 'assets/cart-active.png' },
      { pagePath: 'pages/order/index',   text: 'Orders',  iconPath: 'assets/order.png',   selectedIconPath: 'assets/order-active.png' },
      { pagePath: 'pages/wallet/index',  text: 'Wallet',  iconPath: 'assets/wallet.png',  selectedIconPath: 'assets/wallet-active.png' },
      { pagePath: 'pages/profile/index', text: 'Profile', iconPath: 'assets/profile.png', selectedIconPath: 'assets/profile-active.png' },
    ],
  },
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#1677ff',
    navigationBarTitleText: 'HealthCoin',
    navigationBarTextStyle: 'white',
  },
})
