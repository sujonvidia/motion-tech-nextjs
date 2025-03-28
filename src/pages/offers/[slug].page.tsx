import React, { useEffect, useState, useRef} from 'react';
import { InferGetServerSidePropsType } from 'next';
import { useRouter } from 'next/router';
import { getServerSideProps as checkoutGetServerSideProps } from '@/src/components/pages/checkout/props';
import { getStaticProps as productGetStaticProps } from '@/src/components/pages/products/props';
import { CheckoutPage } from '@/src/components/pages/checkout';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import styled from '@emotion/styled';
import { ContentContainer } from '@/src/components/atoms';
// import { useCheckout } from '@/src/state/checkout';
import { useCart } from '@/src/state/cart';
import { useTranslation } from 'next-i18next';

export const getServerSideProps = async (context: any) => {
    context.res.setHeader('Set-Cookie', [
        'session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;',
        'session.sig=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;',
    ]);
    const checkoutData = await checkoutGetServerSideProps(context);
    const productData = await productGetStaticProps(context);
    
    return {
        props: {
            ...productData.props,
            ...checkoutData.props,
            ...(await serverSideTranslations(context.locale ?? 'en', ['checkout'])),
        },
    };
};

const PageContent: React.FC<InferGetServerSidePropsType<typeof getServerSideProps>> = ({ product, ...props }) => {
    const { addToCart } = useCart();
    // const { checkout } = useCheckout();
    const router = useRouter();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [variantId, setVariantId] = useState<string | undefined>();
    const [addingError, setAddingError] = useState<string | null>(null);
    const orderSectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (router.isReady) {
            setVariantId(router.query.variant as string);
        }
    }, [router.isReady, router.query]);

    useEffect(() => {
        const clearCookies = () => {
            document.cookie.split(";").forEach((cookie) => {
                const [name] = cookie.split("=");
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            });
        };
    
        clearCookies();
    }, []);

    useEffect(() => {
        const handleAddToCart = async () => {
            if (variantId) {
                await addToCart(variantId, 1, false);
                setLoading(true);
            } else {
                setAddingError(t('select-options'));
            }
        };

        if (variantId) {
            handleAddToCart();
        }
    }, [variantId]);

    const handleScrollToOrder = () => {
        orderSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <Wrapper>
            <ContentContainer>
                <StyledLandingContent>
                    <h1>{product.name}</h1>
                    <BulletPoints>
                        <li>Freshly roasted for maximum flavor</li>
                        <li>100% organic Arabica beans</li>
                        <li>Rich, bold, and smooth taste</li>
                        <li>Ethically sourced from sustainable farms</li>
                    </BulletPoints>
                    <ProductImage src={product.featuredAsset?.preview} alt={product.name} />
                    <p><strong>Price:</strong> <del>$550</del> <strong>$450</strong></p>
                    {addingError && <ErrorText>{addingError}</ErrorText>}
                    <OrderButton onClick={handleScrollToOrder}>Buy Now</OrderButton>
                    <VideoContainer>
                        <iframe
                            width="560"
                            height="315"
                            src="https://www.youtube.com/embed/X9tg3J5OiYU"
                            frameBorder="0"
                            allowFullScreen
                        ></iframe>
                    </VideoContainer>
                    <ImageGallery>
                        {product.assets?.map((image, index) => (
                            <GalleryImage key={index} src={image.preview} alt={product.name} />
                        ))}
                    </ImageGallery>
                    <OrderButton onClick={handleScrollToOrder}>Buy Now</OrderButton>
                </StyledLandingContent>
            </ContentContainer>
            {/* {loading && <CheckoutPage {...props} />} */}
            <OrderSection ref={orderSectionRef}>
                {loading && <CheckoutPage {...props} />}
            </OrderSection>
        </Wrapper>
    );
};

const Page = (props: InferGetServerSidePropsType<typeof getServerSideProps>) => (
    <PageContent {...props} />
);

export default Page;

const Wrapper = styled.div`
    margin: 0 auto;
    padding: 2rem;
    max-width: 1200px;
    font-family: Arial, sans-serif;
    background: linear-gradient(to bottom, #ff9966, #ff5e62);
    color: white;
    min-height: 100vh;
`;

const StyledLandingContent = styled.div`
    text-align: center;
    margin-bottom: 2rem;
    font-size: 16px;
    line-height: 1.5;

    h1 {
        font-size: 2.5rem;
        font-weight: bold;
        margin-bottom: 1rem;
    }
`;

const ProductImage = styled.img`
    width: 300px;
    height: auto;
    display: block;
    margin: 20px auto;
    border-radius: 8px;
`;

const PriceContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    margin: 15px 0;
`;

const OriginalPrice = styled.span`
    font-size: 20px;
    color: #ff4d4d;
    text-decoration: line-through;
`;

const DiscountPrice = styled.span`
    font-size: 24px;
    font-weight: bold;
    color: #ffffff;
`;

const BulletPoints = styled.ul`
    margin-top: 10px;
    padding-left: 20px;
    list-style-type: disc;
    text-align: left;
    display: inline-block;
`;

const OrderButton = styled.button`
    display: block;
    width: 220px;
    padding: 12px;
    background: linear-gradient(to right, #ff5f6d, #ffc371);
    color: white;
    text-align: center;
    font-size: 18px;
    font-weight: bold;
    margin: 20px auto;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: transform 0.2s;

    &:hover {
        transform: scale(1.05);
        background: linear-gradient(to right, #ff9966, #ff5e62);
    }
`;

const VideoContainer = styled.div`
    margin: 20px auto;
    display: flex;
    justify-content: center;
`;

const ImageGallery = styled.div`
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 20px;
`;

const GalleryImage = styled.img`
    width: 100px;
    height: 100px;
    object-fit: cover;
    border-radius: 5px;
`;

const OrderSection = styled.div`
    margin-top: 50px;
    padding: 20px;
    background: white;
    color: black;
    text-align: center;
    border-radius: 8px;
`;

const ErrorText = styled.p`
    color: yellow;
    font-weight: bold;
    text-align: center;
`;

export { Page };
