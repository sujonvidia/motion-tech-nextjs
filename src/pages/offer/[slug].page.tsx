import React, { useEffect, useState } from 'react';
import type { InferGetStaticPropsType, GetStaticProps } from 'next';
import { getStaticProps as productGetStaticProps } from '@/src/components/pages/products/props';
import { getStaticPaths } from '@/src/components/pages/products/paths';
import { CheckoutPage } from '@/src/components/pages/checkout';
import { CheckoutProvider } from '@/src/state/checkout';
import { useCart } from '@/src/state/cart';
import { useCheckout } from '@/src/state/checkout';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import styled from '@emotion/styled';
import { ContentContainer } from '@/src/components/atoms';

const LandingPage = (props: InferGetStaticPropsType<typeof productGetStaticProps>) => {
    const { product } = props;
    const { addToCart, fetchActiveOrder } = useCart(); 
    const [activeOrder, setActiveOrder] = useState(null);
    const [loading, setLoading] = useState(true); // ✅ Track loading state
    const [initialLoad, setInitialLoad] = useState(true); // To avoid infinite loop

    useEffect(() => {
        const fetchCheckoutData = async () => {
            const order = await fetchActiveOrder();
            debugger
            if (order) {
                setActiveOrder(order);
                setLoading(false);
            }
        };

        if (product?.variants.length > 0 && initialLoad) {
            setInitialLoad(false); // Disable initial load flag
            const productVariantId = product.variants[0].id;

            if (!activeOrder?.lines?.some(line => line.productVariant.id === productVariantId)) {
                addToCart(productVariantId, 1).then(() => {
                    fetchCheckoutData();
                });
            } else {
                fetchCheckoutData();
            }
        }
    }, [product, activeOrder, initialLoad]); // Add initialLoad to dependency array

    if (!product?.customFields?.landing) {
        return (
            <Wrapper>
                <p>Landing content is not available for this product.</p>
            </Wrapper>
        );
    }

    return (
        <CheckoutProvider>
            <Wrapper>
                <ContentContainer>
                    {/* Render the landing content */}
                    <LandingContent dangerouslySetInnerHTML={{ __html: product.customFields.landing || '' }} />

                    {/* Include product-specific details */}
                    <AdditionalDetails>
                        <h2>{product.name}</h2>
                        {product.variants.length > 0 && (
                            <p>Price: {product.variants[0].priceWithTax} {product.variants[0].currencyCode}</p>
                        )}
                    </AdditionalDetails>

                    {/* ✅ Ensure Order Summary updates dynamically */}
                    {loading ? (
                        <p>Loading Order Summary...</p>
                    ) : (
                        <CheckoutContainer>
                            <CheckoutPage activeOrder={activeOrder} />
                        </CheckoutContainer>
                    )}
                </ContentContainer>
            </Wrapper>
        </CheckoutProvider>
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
            ...(await serverSideTranslations(locale ?? 'en', ['checkout'])),
        },
    };
};

export { getStaticPaths };

const Wrapper = styled.div`
    margin: 0 auto;
    padding: 2rem;
    max-width: 1200px;
    font-family: Arial, sans-serif;
`;

const LandingContent = styled.div`
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
