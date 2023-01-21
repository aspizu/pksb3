import string

# FIXME: Change this to the entire unicode
CHARSET = string.ascii_uppercase


class NameGenerator:
    """Generate sequence of strings like: a, b, ..., az, aa, ab, ..."""

    def __init__(self) -> None:
        self.name = 0

    def __next__(self) -> str:
        value = str(self)
        self.name += 1
        return value

    def __str__(self) -> str:
        def f():
            n = self.name
            while True:
                yield CHARSET[n % len(CHARSET)]
                n //= len(CHARSET)
                if n == 0:
                    break

        return "".join(f())
