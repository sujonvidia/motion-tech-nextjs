import React, { useEffect, useState } from 'react';
import { InferGetServerSidePropsType } from 'next';
import { useRouter } from 'next/router';
import { getServerSideProps as checkoutGetServerSideProps } from '@/src/components/pages/checkout/props';
import { getStaticProps as productGetStaticProps } from '@/src/components/pages/products/props';
import { CheckoutPage } from '@/src/components/pages/checkout';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import styled from '@emotion/styled';
import { ContentContainer } from '@/src/components/atoms';
import { useCart, CartProvider } from '@/src/state/cart';
import { useCheckout } from '@/src/state/checkout';


// Combine both product and checkout data fetching into one getServerSideProps
export const getServerSideProps = async (context: any) => {
    const checkoutData = await checkoutGetServerSideProps(context);
    const productData = await productGetStaticProps(context);
   
    console.log('offer->getServerSideProps',productData, checkoutData);
    return {
        props: {
            ...productData.props,
            ...checkoutData.props,
            ...(await serverSideTranslations(context.locale ?? 'en', ['checkout'])),
        },
    };
};

const PageContent: React.FC<InferGetServerSidePropsType<typeof getServerSideProps>> = ({ 
    product, 
    ...props 
}) => {
    const { addToCart, cart } = useCart(); // ✅ Get cart state
    const { addToCheckout } = useCheckout();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [variantId, setVariantId] = useState<string | undefined>();

    useEffect(() => {
        if (router.isReady) {
            setVariantId(router.query.variant as string);
        }
    }, [router.isReady, router.query]);

    useEffect(() => {
        const addVariantAndProceed = async () => {
            debugger;
            if (variantId) {
                console.log('Adding variant to cart:', variantId);
                // await addToCart(variantId, 1, true);
                await addToCheckout(variantId, 1);
            }
            setTimeout(() => {
                setLoading(true); // ✅ Ensure loading is false only after addToCart completes       
            }, 1000);
            
        };

        if (variantId) {
            addVariantAndProceed();
        } 
        // else {
        //     setLoading(false);
        // }
    }, [variantId]);

    return (
        <Wrapper>
            {product?.customFields?.landing && (
                <ContentContainer>
                    <StyledLandingContent dangerouslySetInnerHTML={{ __html: product.customFields.landing || '' }} />
                </ContentContainer>
            )}

            {/* ✅ Checkout page only loads when loading is false */}
            {loading && <CheckoutPage {...props} />}
        </Wrapper>
    );
};

// ✅ Wrap PageContent inside CartProvider
const Page = (props: InferGetServerSidePropsType<typeof getServerSideProps>) => (
    // <CartProvider>
        <PageContent {...props} />
    // </CartProvider>
);

export default Page;

// Styled components
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
