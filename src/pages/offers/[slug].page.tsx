import React from 'react';
import { InferGetServerSidePropsType } from 'next';
import { getServerSideProps as checkoutGetServerSideProps } from '@/src/components/pages/checkout/props';
import { getStaticProps as productGetStaticProps } from '@/src/components/pages/products/props';
import { CheckoutPage } from '@/src/components/pages/checkout';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { SSRMutation } from '@/src/graphql/client';
import { ActiveOrderSelector } from '@/src/graphql/selectors';
import styled from '@emotion/styled';
import { ContentContainer } from '@/src/components/atoms';
import { OrderPayment } from '@/src/components/pages/checkout/components/OrderPayment';

export const getServerSideProps = async (context: any) => {
    const productData = await productGetStaticProps(context);
    const product = productData.props.product;

    if (product?.variants?.length > 0) {
        const firstVariant = product.variants[0];
        try {
            const addResult = await SSRMutation(context)({
                addItemToOrder: [
                    { productVariantId: firstVariant.id, quantity: 1 },
                    {
                        __typename: true,
                        '...on Order': ActiveOrderSelector,
                        '...on OrderLimitError': { errorCode: true, message: true },
                        '...on InsufficientStockError': { errorCode: true, message: true },
                        '...on NegativeQuantityError': { errorCode: true, message: true },
                        '...on OrderModificationError': { errorCode: true, message: true },
                    },
                ],
            });
            if (addResult?.addItemToOrder?.__typename === 'Order') {
                await SSRMutation(context)({
                    transitionOrderToState: [
                        { state: 'ArrangingPayment' },
                        {
                            __typename: true,
                            '...on Order': ActiveOrderSelector,
                            '...on OrderStateTransitionError': { errorCode: true, message: true },
                        },
                    ],
                });
            }
        } catch (e) {
            console.error('Failed to add item to order on offer page', e);
        }
    }

    const checkoutData = await checkoutGetServerSideProps(context);
    console.log('checkoutData:offer:', checkoutData.props);

    return {
        props: {
            ...productData.props,
            ...checkoutData.props,
            eligiblePaymentMethods: checkoutData.props.eligiblePaymentMethods || [],
            ...(await serverSideTranslations(context.locale ?? 'en', ['checkout'])),
        },
    };
};

const Page: React.FC<InferGetServerSidePropsType<typeof getServerSideProps>> = ({ product, availableCountries, checkout, eligiblePaymentMethods, stripeData, ...props }) => {
    return (
        <Wrapper>
            <ImageSliderSection>
                <ImageSliderContainer>
                    {(product?.assets?.length ? product.assets : (product?.featuredAsset ? [product.featuredAsset] : [])).map((asset, index) => (
                        <ImageSlide key={index} src={asset.preview?.replace(/\\/g, '/')} alt={product.name} />
                    ))}
                </ImageSliderContainer>
                {product?.featuredAsset && (
                    <FeaturedImage src={product.featuredAsset.preview?.replace(/\\/g, '/')} alt={product.name} />
                )}
            </ImageSliderSection>

            {product?.customFields?.landing && (
                <ContentContainer>
                    <StyledLandingContent dangerouslySetInnerHTML={{ __html: product.customFields.landing || '' }} />
                </ContentContainer>
            )}

            <CheckoutPage {...props} />
            <OrderPayment availablePaymentMethods={eligiblePaymentMethods} stripeData={stripeData} />
        </Wrapper>
    );
};

export default Page;

const Wrapper = styled.div`
    margin: 0 auto;
    padding: 0;
    max-width: 100%;
    font-family: Arial, sans-serif;
`;

const ImageSliderSection = styled.div`
    position: relative;
    width: 100%;
    background: #fff;
`;

const ImageSliderContainer = styled.div`
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;

    &::-webkit-scrollbar {
        display: none;
    }
`;

const ImageSlide = styled.img`
    flex: 0 0 100%;
    width: 100%;
    height: 60vh;
    object-fit: cover;
    scroll-snap-align: start;
`;

const FeaturedImage = styled.img`
    position: absolute;
    bottom: 20px;
    right: 20px;
    width: 120px;
    height: 120px;
    object-fit: cover;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    border: 3px solid #fff;
`;

const StyledLandingContent = styled.div`
    margin: 0;
    padding: 2rem;
    max-width: 1200px;
    margin-left: auto;
    margin-right: auto;
    font-size: 16px;
    line-height: 1.5;

    img {
        max-width: 100%;
        height: auto;
    }
`;
