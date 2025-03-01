import React from 'react';
import '../styles/global.css';
import 'keen-slider/keen-slider.min.css';
import { AppProps } from 'next/app';
import { appWithTranslation } from 'next-i18next';
import { Nunito_Sans } from 'next/font/google';
import { Global, ThemeProvider } from '@emotion/react';
import { LightTheme } from '@/src/theme';
import { CartProvider } from '@/src/state/cart';
import { CheckoutProvider } from '@/src/state/checkout';
import { ProductProvider } from '@/src/state/product';
import { CollectionProvider } from '@/src/state/collection';
import { ChannelsProvider } from '../state/channels';

const nunito = Nunito_Sans({ subsets: ['latin'], variable: '--nunito-font' });

const App = ({ Component, pageProps }: AppProps) => {
    return (
        <ThemeProvider theme={LightTheme}>
            <ChannelsProvider initialState={{ channel: pageProps.channel, locale: pageProps.locale }}>
                <CartProvider>
                    <CheckoutProvider initialState={{ checkout: pageProps.checkout }}>
                        <ProductProvider
                            initialState={{
                                product: 'product' in pageProps ? pageProps.product : undefined,
                            }}>
                            <CollectionProvider
                                initialState={{
                                    collection: 'collection' in pageProps ? pageProps.collection : undefined,
                                    products: 'products' in pageProps ? pageProps.products : undefined,
                                    facets: 'facets' in pageProps ? pageProps.facets : undefined,
                                    totalProducts: 'totalProducts' in pageProps ? pageProps.totalProducts : undefined,
                                    filters: 'filters' in pageProps ? pageProps.filters : undefined,
                                    searchQuery: 'searchQuery' in pageProps ? pageProps.searchQuery : undefined,
                                    page: 'page' in pageProps ? pageProps.page : undefined,
                                    sort: 'sort' in pageProps ? pageProps.sort : undefined,
                                }}>
                                <Global styles={`body { font-family:${nunito.style.fontFamily}; }`} />
                                <Component {...pageProps} />
                            </CollectionProvider>
                        </ProductProvider>
                    </CheckoutProvider>
                </CartProvider>
            </ChannelsProvider>
        </ThemeProvider>
    );
};

export default appWithTranslation(App);
