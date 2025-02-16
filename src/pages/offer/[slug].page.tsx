import React, { useEffect, useState } from 'react';
import type { InferGetStaticPropsType, GetStaticProps } from 'next';
import { getStaticProps as productGetStaticProps } from '@/src/components/pages/products/props';
import { getStaticPaths } from '@/src/components/pages/products/paths';
import { CheckoutPage } from '@/src/components/pages/checkout';
import { CheckoutProvider, useCheckout } from '@/src/state/checkout';
import { useCart } from '@/src/state/cart';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import styled from '@emotion/styled';
import { ContentContainer } from '@/src/components/atoms';

const LandingPage = (props: InferGetStaticPropsType<typeof productGetStaticProps>) => {
    const { t } = useTranslation('checkout'); // ✅ Ensures translations are loaded
    const { product } = props;
    const { addToCart, fetchActiveOrder } = useCart();
    const [loading, setLoading] = useState(true);
    const [hasAddedToCart, setHasAddedToCart] = useState(false); // ✅ Prevent infinite loop

    useEffect(() => {
        const fetchOrderData = async () => {
            const order = await fetchActiveOrder();

            // ✅ Check if the product is already in the order
            const isProductInOrder = order?.lines?.some(line => line.productVariant.id === product?.variants[0]?.id);

            if (!isProductInOrder && product?.variants.length > 0 && !hasAddedToCart) {
                const productVariantId = product.variants[0].id;

                setHasAddedToCart(true);
                addToCart(productVariantId, 1).then(fetchOrderData); // ✅ Add product & refresh order
            } else {
                setLoading(false);
            }
        };

        fetchOrderData();
    }, [product]); // ✅ Prevents infinite loops

    if (!product?.customFields?.landing) {
        return (
            <Wrapper>
                <p>{t('landingPage.notAvailable', 'Landing content is not available for this product.')}</p>
            </Wrapper>
        );
    }

    return (
        <CheckoutProvider>
            <Wrapper>
                <ContentContainer>
                    {/* ✅ Render the landing content safely */}
                    <StyledLandingContent dangerouslySetInnerHTML={{ __html: product.customFields.landing || '' }} />

                    {/* ✅ Product Details */}
                    <AdditionalDetails>
                        <h2>{product.name}</h2>
                        {product.variants.length > 0 && (
                            <p>{t('price', 'Price')}: {product.variants[0].priceWithTax} {product.variants[0].currencyCode}</p>
                        )}
                    </AdditionalDetails>

                    {/* ✅ Ensure Order Summary updates dynamically */}
                    <CheckoutContent loading={loading} />
                </ContentContainer>
            </Wrapper>
        </CheckoutProvider>
    );
};

// ✅ Separate component to avoid "useCheckout()" outside provider
const CheckoutContent = ({ loading }: { loading: boolean }) => {
    const { activeOrder } = useCheckout(); // ✅ Now correctly inside CheckoutProvider
    const { t } = useTranslation('checkout'); // ✅ Ensure translations are available

    return loading ? (
        <p>{t('orderSummary.loading', 'Loading Order Summary...')}</p>
    ) : (
        <CheckoutContainer>
            <CheckoutPage activeOrder={activeOrder} />
        </CheckoutContainer>
    );
};

export default LandingPage;

export const getStaticProps: GetStaticProps = async (context) => {
    const { params, locale } = context;

    if (!params?.slug || (Array.isArray(params.slug) && params.slug.length === 0)) {
        return { notFound: true };
    }

    const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
    const channel = 'cgyub4spjr2ycq17h6x';

    const productProps = await productGetStaticProps({
        params: { slug, locale: locale ?? 'en', channel },
    });

    return {
        props: {
            ...productProps.props,
            ...(await serverSideTranslations(locale ?? 'en', ['checkout'])), // ✅ Loads translations
        },
    };
};

export { getStaticPaths };

// ✅ Styled components
const Wrapper = styled.div`
    margin: 0 auto;
    padding: 2rem;
    max-width: 1200px;
    font-family: Arial, sans-serif;
`;

const StyledLandingContent = styled.div`
    margin-bottom: 2rem;
    font-size: 16px;
    line-height: 1.5;

    img {
        max-width: 100%;
        height: auto;
    }
`;

const AdditionalDetails = styled.div`
    margin-top: 2rem;
    border-top: 1px solid #ddd;
    padding-top: 1rem;

    h2 {
        font-size: 1.5rem;
        margin-bottom: 1rem;
    }

    p {
        font-size: 1rem;
    }
`;

const CheckoutContainer = styled.div`
    margin-top: 3rem;
    border-top: 2px solid #ccc;
    padding-top: 2rem;
`;
